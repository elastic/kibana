/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Client } from '@elastic/elasticsearch';
import AggregateError from 'aggregate-error';
import { Writable } from 'stream';
import * as os from 'os';
import { flow } from 'fp-ts/function';
import { Stats } from '../stats';
import { ES_CLIENT_HEADERS } from '../../client_headers';

enum BulkOperation {
  Create = 'create',
  Index = 'index',
}

export function createIndexDocRecordsStream(
  client: Client,
  stats: Stats,
  useCreate: boolean = false
): Writable {
  const doIndexDocs = indexDocs(stats, client, useCreate);

  return new Writable({
    highWaterMark: parseInt((process.env.HIGH_WATER_MARK as string) ?? 5000, 10),
    objectMode: true,

    async write(record, enc, callback): Promise<void> {
      try {
        await doIndexDocs([record.value]);
        callback(null);
      } catch (err) {
        callback(err);
      }
    },

    async writev(chunks, callback): Promise<void> {
      try {
        await doIndexDocs(chunks.map(({ chunk: record }) => record.value));
        callback(null);
      } catch (err) {
        callback(err);
      }
    },
  });
}

const buildRequest =
  (indexOrCreate: BulkOperation) => (ops: WeakMap<any, any>) => (jsonStanza: any) => {
    const body = jsonStanza.source;
    ops.set(body, {
      [jsonStanza.data_stream ? BulkOperation.Create : indexOrCreate]: {
        _index: jsonStanza.data_stream || jsonStanza.index,
        _id: jsonStanza.id,
      },
    });
    return body;
  };
const cpuCount = () => os.cpus().length;
const concurrencyMaxMinus1 = () => cpuCount() - 1;
const eagerUpdate = (stats: Stats) => (jsonStanza: any) => {
  stats.indexedDoc(jsonStanza.data_stream || jsonStanza.index);
  return jsonStanza;
};
function indexDocs(stats: Stats, client: Client, useCreate: boolean = false) {
  return async (jsonStanzasWithinArchive: any[]): Promise<void> => {
    const indexOrCreate: BulkOperation = useCreate ? BulkOperation.Create : BulkOperation.Index;
    const ops: WeakMap<any, any> = new WeakMap<any, any>();
    const errors: string[] = [];

    await client.helpers.bulk(
      {
        retries: 5,
        concurrency: concurrencyMaxMinus1(),
        datasource: jsonStanzasWithinArchive.map(
          flow(eagerUpdate(stats), buildRequest(indexOrCreate)(ops))
        ),
        onDocument(doc) {
          return ops.get(doc);
        },
        onDrop(dropped): void {
          errors.push(`
Bulk doc failure [operation=${indexOrCreate}]:\n  doc: ${JSON.stringify(
            dropped.document
          )}\n  error: ${JSON.stringify(dropped.error)}`);
        },
      },
      {
        headers: ES_CLIENT_HEADERS,
      }
    );

    if (errors.length) throw new AggregateError(errors);
  };
}
