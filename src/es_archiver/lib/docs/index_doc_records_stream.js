/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Writable } from 'stream';

export function createIndexDocRecordsStream(client, stats, progress) {
  async function indexDocs(docs) {
    const body = [];

    docs.forEach(doc => {
      stats.indexedDoc(doc.index);
      body.push(
        {
          index: {
            _index: doc.index,
            _id: doc.id,
          },
        },
        doc.source
      );
    });

    const resp = await client.bulk({ body });
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
