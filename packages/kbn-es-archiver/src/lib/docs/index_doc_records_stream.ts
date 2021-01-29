/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Client } from 'elasticsearch';
import { Writable } from 'stream';
import { Stats } from '../stats';
import { Progress } from '../progress';

export function createIndexDocRecordsStream(
  client: Client,
  stats: Stats,
  progress: Progress,
  useCreate: boolean = false
) {
  async function indexDocs(docs: any[]) {
    const body: any[] = [];
    const operation = useCreate === true ? 'create' : 'index';
    docs.forEach((doc) => {
      stats.indexedDoc(doc.index);
      body.push(
        {
          [operation]: {
            _index: doc.index,
            _id: doc.id,
          },
        },
        doc.source
      );
    });

    const resp = await client.bulk({ requestTimeout: 2 * 60 * 1000, body });
    if (resp.errors) {
      throw new Error(`Failed to index all documents: ${JSON.stringify(resp, null, 2)}`);
    }
  }

  return new Writable({
    highWaterMark: 300,
    objectMode: true,

    async write(record, enc, callback) {
      try {
        await indexDocs([record.value]);
        progress.addToComplete(1);
        callback(null);
      } catch (err) {
        callback(err);
      }
    },

    async writev(chunks, callback) {
      try {
        await indexDocs(chunks.map(({ chunk: record }) => record.value));
        progress.addToComplete(chunks.length);
        callback(null);
      } catch (err) {
        callback(err);
      }
    },
  });
}
