/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint no-console: ["error",{ allow: ["log"] }] */

import type { Client } from '@elastic/elasticsearch';
import AggregateError from 'aggregate-error';
import { Writable } from 'stream';
import { opendirSync } from 'fs';
// import { pipe } from 'fp-ts/function';
// import * as TE from 'fp-ts/TaskEither';
// import fs from 'fs/promises';
// import { toError } from 'fp-ts/Either';
import { isGzip } from '..';
import { Stats } from '../stats';
import { Progress } from '../progress';
import { ES_CLIENT_HEADERS } from '../../client_headers';
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { cpuCount } from '../../../../../test/api_integration/apis/local_and_ess_is_es_archiver_slow/utils';

enum BulkOperation {
  Create = 'create',
  Index = 'index',
}

const isCompressed = (x: string): boolean => {
  const opened = opendirSync(x);
  const dirent = opened.readSync();
  // @ts-ignore
  const isIt: boolean = isGzip(dirent?.name);
  opened.closeSync();
  return isIt;
};
export function createIndexDocRecordsStream(
  client: Client,
  stats: Stats,
  progress: Progress,
  useCreate: boolean = false,
  inputDir: string
): Writable {
  const doIndexDocs = indexDocs(stats, client, useCreate);

  // let stanzasCount = 0;
  return new Writable({
    highWaterMark: isCompressed(inputDir) ? 5000 : 300,
    objectMode: true,

    async write(record, enc, callback): Promise<void> {
      const jsonStanza = [record.value];
      try {
        await doIndexDocs(jsonStanza);
        progress.addToComplete(1);
        // stanzasCount++;
        // console.log(`\nλjs write-stanzasCount: \n\t${stanzasCount}`);
        callback(null);
      } catch (err) {
        callback(err);
      }
    },

    // I didnt know what writev was and now I kinda do:
    // https://medium.com/@mark.birbeck/using-writev-to-create-a-fast-writable-stream-for-elasticsearch-ac69bd010802
    async writev(chunks, callback): Promise<void> {
      try {
        await doIndexDocs(chunks.map(({ chunk: record }) => record.value));
        progress.addToComplete(chunks.length);
        // stanzasCount++;
        // console.log(`\nλjs WRITEV-stanzasCount: \n\t${stanzasCount}`);
        callback(null);
      } catch (err) {
        callback(err);
      }
    },
  });
}
const concurrencyMaxMinus1 = () => cpuCount() - 1;
const isSame = (a) => (b) => {
  return a === b;
};
function indexDocs(stats: Stats, client: Client, useCreate: boolean = false) {
  return async (jsonStanzasWithinArchive: any[]): Promise<void> => {
    // const length = jsonStanzasWithinArchive.length;
    // console.log(`\nλjs jsonStanzasWithinArchive.length: \n\t${length}`);
    const operation = useCreate ? BulkOperation.Create : BulkOperation.Index;
    const isSameAsOperation = isSame(operation);
    const ops = new WeakMap<any, any>();
    const errors: string[] = [];

    await client.helpers.bulk(
      {
        // flushBytes: 10000000,
        // flushInterval: 10000,
        concurrency: concurrencyMaxMinus1(),
        retries: 3,
        datasource: jsonStanzasWithinArchive
          // .map((x) => {
          //   // console.log(`\nλjs jsonStanzaWithinArchive: \n\t${JSON.stringify(x, null, 2)}`);
          //   return x;
          // })
          .map((doc) => {
            const body = doc.source;
            const op = doc.data_stream ? BulkOperation.Create : operation;
            // console.log(`\nλjs op: \n${JSON.stringify(op, null, 2)}`);
            const isSameAsOp = isSameAsOperation(op);
            console.log(`\nλjs isSameAsOp: \n\t${isSameAsOp}`);
            const index = doc.data_stream || doc.index;
            ops.set(body, {
              [op]: {
                _index: index,
                _id: doc.id,
              },
            });
            // console.log(`\nλjs op: \n${JSON.stringify(op, null, 2)}`);
            return body;
          }),
        onDocument(doc) {
          return ops.get(doc);
        },
        onDrop(dropped): void {
          const dj = JSON.stringify(dropped.document);
          const ej = JSON.stringify(dropped.error);
          errors.push(`Bulk doc failure [operation=${operation}]:\n  doc: ${dj}\n  error: ${ej}`);
        },
      },
      {
        headers: ES_CLIENT_HEADERS,
      }
    );

    if (errors.length) throw new AggregateError(errors);

    for (const stanza of jsonStanzasWithinArchive)
      stats.indexedDoc(stanza.data_stream || stanza.index);
  };
}
