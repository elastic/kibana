/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
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
  rmdirSync,
} from 'fs';
import { Readable, Writable } from 'stream';
import { fromNode } from 'bluebird';
import { ToolingLog } from '@kbn/dev-utils';
import { createPromiseFromStreams, createMapStream, createFilterStream } from '@kbn/utils';
import {
  prioritizeMappings,
  readDirectory,
  isGzip,
  createParseArchiveStreams,
  createFormatArchiveStreams,
} from '../lib';

async function isDirectory(path: string): Promise<boolean> {
  const stats: Stats = await fromNode((cb) => stat(path, cb));
  return stats.isDirectory();
}

function convertLegacyTypeToMetricsetName(type: string) {
  switch (type) {
    case 'shards':
      return 'shard';
  }
  return type;
}

function applyCustomRules(legacyDoc: any, mbDoc: any) {
  if (legacyDoc.type === 'shards') {
    set(mbDoc, 'elasticsearch.cluster.state.id', legacyDoc.state_uuid);
    set(mbDoc, 'elasticsearch.cluster.stats.state.state_uuid', legacyDoc.state_uuid);
  }
  if (legacyDoc.type === 'cluster_stats') {
    set(
      mbDoc,
      'elasticsearch.cluster.stats.indices.docs.total',
      legacyDoc.cluster_stats.indices.docs.count
    );
    set(
      mbDoc,
      'elasticsearch.cluster.stats.indices.store.size.bytes',
      legacyDoc.cluster_stats.indices.store.size_in_bytes
    );
  }
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
        createMapStream<any>((item) => {
          if (
            item &&
            (item.type === '_doc' || item.type === 'doc') &&
            item.value.index.indexOf('-es') > -1
          ) {
            const legacyDoc = item.value.source;
            const mbDoc = {
              metricset: {
                name: convertLegacyTypeToMetricsetName(legacyDoc.type),
              },
            };
            // const debug = legacyDoc.type === 'shards';
            for (const alias of aliases) {
              let value = _.get(legacyDoc, alias.key, null);
              if (value === null && alias.key.includes('.shards.')) {
                value = _.get(legacyDoc, alias.key.replace('.shards.', '.shards[0].'), null);
              }
              if (value !== null) {
                set(mbDoc, alias.path, value);
              }
            }
            applyCustomRules(legacyDoc, mbDoc);
            if (!_.isEmpty(mbDoc)) {
              foundMbFiles = true;
              return {
                ...item,
                value: {
                  ...item.value,
                  index: `metricbeat-8.0.0`,
                  source: {
                    ...mbDoc,
                  },
                },
              };
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
