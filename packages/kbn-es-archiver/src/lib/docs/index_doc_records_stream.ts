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
import { isGzip } from '..';
import { Stats } from '../stats';
import { Progress } from '../progress';
import { ES_CLIENT_HEADERS } from '../../client_headers';

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

  const highWaterMark: number = isCompressed(inputDir) ? 5000 : 300;
  return new Writable({
    highWaterMark,
    objectMode: true,

    async write(record, enc, callback): Promise<void> {
      const jsonStanza = [record.value];
      try {
        await doIndexDocs(jsonStanza);
        progress.addToComplete(1);
        callback(null);
      } catch (err) {
        callback(err);
      }
    },

    async writev(chunks, callback): Promise<void> {
      try {
        await doIndexDocs(chunks.map(({ chunk: record }) => record.value));
        progress.addToComplete(chunks.length);
        callback(null);
      } catch (err) {
        callback(err);
      }
    },
  });
}
function indexDocs(stats: Stats, client: Client, useCreate: boolean = false) {
  return async (jsonStanzasWithinArchive: any[]): Promise<void> => {
    const operation = useCreate ? BulkOperation.Create : BulkOperation.Index;
    const ops = new WeakMap<any, any>();
    const errors: string[] = [];

    await client.helpers.bulk(
      {
        retries: 5,
        datasource: jsonStanzasWithinArchive.map((doc) => {
          const body = doc.source;
          const op = doc.data_stream ? BulkOperation.Create : operation;
          const index = doc.data_stream || doc.index;
          ops.set(body, {
            [op]: {
              _index: index,
              _id: doc.id,
            },
          });
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
