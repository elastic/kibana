/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { Transform } from 'stream';
import { set } from '@elastic/safer-lodash-set';
import { resolve, dirname, relative } from 'path';
import {
  stat,
  Stats,
  rename,
  createReadStream,
  createWriteStream,
  readFileSync,
  existsSync,
  mkdirSync,
  copyFileSync,
  appendFileSync,
  rmdirSync,
} from 'fs';
import { Readable, Writable } from 'stream';
import { fromNode } from 'bluebird';
import { ToolingLog } from '@kbn/dev-utils';
import { createPromiseFromStreams, createFilterStream } from '@kbn/utils';
import {
  prioritizeMappings,
  readDirectory,
  isGzip,
  createParseArchiveStreams,
  createFormatArchiveStreams,
} from '../lib';

function makeid(length: number) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export function createChrisStream<T>(fn: (value: T, i: number) => any[] | undefined) {
  let i = 0;

  return new Transform({
    objectMode: true,
    async transform(value, enc, done) {
      try {
        const results = await fn(value, i++);
        if (results) {
          for (const result of results) {
            this.push(result);
          }
        }
        done();
      } catch (err) {
        done(err);
      }
    },
  });
}

async function isDirectory(path: string): Promise<boolean> {
  const stats: Stats = await fromNode((cb) => stat(path, cb));
  return stats.isDirectory();
}

function convertLegacyTypeToMetricsetName(type: string) {
  switch (type) {
    case 'shards':
      return 'shard';
    case 'ccr_stats':
      return 'ccr';
  }
  return type;
}

// Mimics metricbeat/module/elasticsearch/ccr/data.go
function transformCcr(legacyDoc: any) {
  const ccr = legacyDoc.ccr_stats;
  return {
    leader: {
      index: ccr.leader_index,
      max_seq_no: ccr.leader_max_seq_no,
      global_checkpoint: ccr.leader_global_checkpoint,
    },
    total_time: {
      read: {
        ms: ccr.total_read_time_millis,
        remote_exec: {
          ms: ccr.total_read_remote_exec_time_millis,
        },
      },
      write: {
        ms: ccr.total_write_time_millis,
      },
    },
    write_buffer: {
      size: {
        bytes: ccr.write_buffer_size_in_bytes,
      },
      operation: {
        count: ccr.write_buffer_operation_count,
      },
    },
    bytes_read: ccr.bytes_read,
    follower: {
      index: ccr.follower_index,
      shard: {
        number: ccr.shard_id,
      },
      operations_written: ccr.operations_written,
      operations: {
        read: {
          count: ccr.operations_read,
        },
      },
      max_seq_no: ccr.follower_max_seq_no,
      time_since_last_read: {
        ms: ccr.time_since_last_read_millis,
      },
      global_checkpoint: ccr.follower_global_checkpoint,
      settings_version: ccr.follower_settings_version,
      aliases_version: ccr.follower_aliases_version,
    },
    read_exceptions: ccr.read_exceptions,
    requests: {
      successful: {
        read: {
          count: ccr.successful_read_requests,
        },
        write: {
          count: ccr.successful_write_requests,
        },
      },
      failed: {
        read: {
          count: ccr.failed_read_requests,
        },
        write: {
          count: ccr.failed_write_requests,
        },
      },
      outstanding: {
        read: {
          count: ccr.outstanding_read_requests,
        },
        write: {
          count: ccr.outstanding_write_requests,
        },
      },
    },
  };
}

const hashes: any = {};

function applyCustomESRules(item: any, legacyDoc: any, mbDoc: any) {
  const extraMbDocs = [];

  set(mbDoc, 'elasticsearch.node', {
    ...legacyDoc.source_node,
    ...mbDoc.elasticsearch.node,
  });

  if (legacyDoc.type === 'shards') {
    set(mbDoc, 'elasticsearch.cluster.state.id', legacyDoc.state_uuid);
    set(mbDoc, 'elasticsearch.cluster.stats.state.state_uuid', legacyDoc.state_uuid);
    set(mbDoc, 'elasticsearch.shard.relocating_node.id', legacyDoc.shard.relocating_node);
  }
  if (legacyDoc.type === 'cluster_stats') {
    set(
      mbDoc,
      'elasticsearch.cluster.stats.indices.docs.total',
      legacyDoc.cluster_stats.indices.docs.count
    );
    set(
      mbDoc,
      'elasticsearch.cluster.stats.indices.docs.deleted',
      legacyDoc.cluster_stats.indices.docs.deleted
    );
    set(
      mbDoc,
      'elasticsearch.cluster.stats.indices.store.size.bytes',
      legacyDoc.cluster_stats.indices.store.size_in_bytes
    );
    set(mbDoc, 'elasticsearch.cluster.stats.state', legacyDoc.cluster_state);
    set(mbDoc, 'elasticsearch.cluster.name', legacyDoc.cluster_name);
    set(
      mbDoc,
      'elasticsearch.cluster.stats.license.expiry_date_in_millis',
      legacyDoc.license.expiry_date_in_millis
    );
    set(
      mbDoc,
      'elasticsearch.cluster.stats.nodes.fs.total.bytes',
      legacyDoc.cluster_stats.nodes.fs.total_in_bytes
    );
    set(
      mbDoc,
      'elasticsearch.cluster.stats.nodes.fs.available.bytes',
      legacyDoc.cluster_stats.nodes.fs.available_in_bytes
    );
    set(
      mbDoc,
      'elasticsearch.cluster.stats.indices.shards.primaries',
      legacyDoc.cluster_stats.indices.shards.primaries
    );
    set(
      mbDoc,
      'elasticsearch.cluster.stats.nodes.versions',
      legacyDoc.cluster_stats.nodes.versions
    );
  }
  if (legacyDoc.type === 'node_stats') {
    set(mbDoc, 'service.address', legacyDoc.source_node.transport_address);
  }
  if (legacyDoc.type === 'index_recovery') {
    const first = legacyDoc.index_recovery.shards.shift();
    set(mbDoc, 'elasticsearch.index.recovery', first);
    for (const shard of legacyDoc.index_recovery.shards) {
      const extraMbDoc = {
        ...item,
        value: {
          ...item.value,
          id: makeid(12),
          index: `metricbeat-8.0.0`,
          source: {
            ...mbDoc,
            elasticsearch: {
              ...mbDoc.elasticsearch,
              index: {
                ...mbDoc.elasticsearch.index,
                recovery: shard,
              },
            },
          },
        },
      };
      const hash = JSON.stringify(shard);
      if (!hashes[hash]) {
        hashes[hash] = true;
        extraMbDocs.push(extraMbDoc);
      }
    }
  }

  if (legacyDoc.type === 'ccr_stats') {
    set(mbDoc, 'elasticsearch.ccr', transformCcr(legacyDoc));
  }

  return [
    {
      ...item,
      value: {
        ...item.value,
        index: `metricbeat-8.0.0`,
        source: {
          ...mbDoc,
        },
      },
    },
    ...extraMbDocs,
  ];
}

function applyCustomKibanaRules(item: any, legacyDoc: any, mbDoc: any) {
  set(mbDoc, '@timestamp', legacyDoc.kibana_stats?.timestamp);
  set(mbDoc, 'kibana.stats.uuid', legacyDoc.kibana_stats?.kibana?.uuid ?? undefined);
  set(mbDoc, 'kibana.kibana', legacyDoc.kibana_stats?.kibana ?? undefined);
  return [
    {
      ...item,
      value: {
        ...item.value,
        index: `metricbeat-8.0.0`,
        source: {
          ...mbDoc,
        },
      },
    },
  ];
}

function applyCustomLogstashRules(item: any, legacyDoc: any, mbDoc: any) {
  set(mbDoc, '@timestamp', legacyDoc.logstash_stats?.timestamp);
  set(mbDoc, 'logstash.node.stats.timestamp', legacyDoc.logstash_stats?.timestamp);
  set(mbDoc, 'logstash.node.stats.logstash', legacyDoc.logstash_stats?.logstash);
  set(mbDoc, 'logstash.node.stats.pipelines', legacyDoc.logstash_stats?.pipelines);
  set(
    mbDoc,
    'logstash.node.stats.jvm.mem.heap_used_percent',
    legacyDoc.logstash_stats?.jvm.mem.heap_used_percent
  );
  set(mbDoc, 'logstash.node.stats.reloads', legacyDoc.logstash_stats?.reloads);
  set(mbDoc, 'logstash.node.stats.events', legacyDoc.logstash_stats?.events);
  return [
    {
      ...item,
      value: {
        ...item.value,
        index: `metricbeat-8.0.0`,
        source: {
          ...mbDoc,
        },
      },
    },
  ];
}

export async function rebuildAllAction({
  dataDir,
  log,
  rootDir = dataDir,
}: {
  dataDir: string;
  log: ToolingLog;
  rootDir?: string;
}) {
  const aliases = JSON.parse(readFileSync('/Users/chris/Desktop/mb_aliases.json').toString());
  let childNames = prioritizeMappings(await readDirectory(dataDir));
  if (dataDir === '/Users/chris/dev/repos/kibana/x-pack/test/functional/es_archives') {
    childNames = ['monitoring'];
  }
  for (const childName of childNames) {
    const childPath = resolve(dataDir, childName);

    if (await isDirectory(childPath)) {
      await rebuildAllAction({
        dataDir: childPath,
        log,
        rootDir,
      });
      continue;
    }

    const archiveName = dirname(relative(rootDir, childPath));
    log.info(`${archiveName} Rebuilding ${childName}`);
    const gzip = isGzip(childPath);
    const tempFile = childPath + (gzip ? '.rebuilding.gz' : '.rebuilding');

    if (childName.includes('data.json') && !archiveName.includes('_mb')) {
      const existingDir = `${rootDir}/${archiveName}`;
      const mbDir = `${rootDir}/${archiveName}_mb`;
      const mbTempFile = `${mbDir}/${childName + (gzip ? '.rebuilding.gz' : '.rebuilding')}`;
      const mbFile = mbTempFile.replace('.rebuilding.gz', '');
      if (!existsSync(mbDir)) {
        mkdirSync(mbDir);
      }
      let foundMbFiles = false;
      await createPromiseFromStreams([
        createReadStream(childPath) as Readable,
        ...createParseArchiveStreams({ gzip }),
        createChrisStream<any>((item) => {
          if (
            item &&
            (item.type === '_doc' || item.type === 'doc') &&
            (item.value.index.indexOf('-es') > -1 ||
              item.value.index.indexOf('-kibana') > -1 ||
              item.value.index.indexOf('-logstash') > -1)
          ) {
            const legacyDoc = item.value.source;
            const mbDoc = {
              metricset: {
                name: convertLegacyTypeToMetricsetName(legacyDoc.type),
              },
            };
            for (const alias of aliases) {
              let value = _.get(legacyDoc, alias.key, null);
              if (item.value.index.indexOf('-es') > -1) {
                if (value === null && alias.key.includes('.shards.')) {
                  value = _.get(legacyDoc, alias.key.replace('.shards.', '.shards[0].'), null);
                }
              }
              if (value !== null) {
                set(mbDoc, alias.path, value);
              }
            }
            const skipMbConversion =
              archiveName.includes('monitoring/setup/collection') &&
              item.value.index.indexOf('-mb') === -1;
            const mbDocs = [];
            if (skipMbConversion) {
              mbDocs.push(item);
            } else {
              if (item.value.index.indexOf('-es') > -1) {
                mbDocs.push(...applyCustomESRules(item, legacyDoc, mbDoc));
              } else if (item.value.index.indexOf('-kibana') > -1) {
                mbDocs.push(...applyCustomKibanaRules(item, legacyDoc, mbDoc));
              } else if (item.value.index.indexOf('-logstash') > -1) {
                mbDocs.push(...applyCustomLogstashRules(item, legacyDoc, mbDoc));
              } else {
                mbDocs.push({
                  ...item,
                  value: {
                    ...item.value,
                    index: `metricbeat-8.0.0`,
                    source: {
                      ...mbDoc,
                    },
                  },
                });
              }
            }

            if (mbDocs && mbDocs.length && !_.isEmpty(mbDocs[0])) {
              foundMbFiles = true;
              return mbDocs;
            }
          }
          return undefined;
        }),
        createFilterStream<any>((l) => Boolean(l)),
        ...createFormatArchiveStreams({ gzip }),
        createWriteStream(mbTempFile),
      ] as [Readable, ...Writable[]]);
      if (foundMbFiles) {
        await fromNode((cb) => rename(mbTempFile, mbFile, cb));
        copyFileSync(`/Users/chris/Desktop/mb_settings.json`, `${mbDir}/mappings.json`);
        appendFileSync(
          `${mbDir}/mappings.json`,
          `\n\n${readFileSync(`${existingDir}/mappings.json`)}`
        );
      } else {
        try {
          rmdirSync(mbDir, { recursive: true });
          // eslint-disable-next-line no-empty
        } catch (e) {}
      }
    }

    await createPromiseFromStreams([
      createReadStream(childPath) as Readable,
      ...createParseArchiveStreams({ gzip }),
      ...createFormatArchiveStreams({ gzip }),
      createWriteStream(tempFile),
    ] as [Readable, ...Writable[]]);

    await fromNode((cb) => rename(tempFile, childPath, cb));
    log.info(`${archiveName} Rebuilt ${childName}`);
  }
}
