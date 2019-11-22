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

import readline from 'readline';
import fs from 'fs';
import { createUnzip } from 'zlib';

const BULK_INSERT_SIZE = 500;

export function loadData(path: any, bulkInsert: (docs: any[]) => Promise<void>) {
  return new Promise((resolve, reject) => {
    let count: number = 0;
    let docs: any[] = [];
    let isPaused: boolean = false;

    // pause does not stop lines already in buffer. Use smaller buffer size to avoid bulk inserting to many records
    const readStream = fs.createReadStream(path, { highWaterMark: 1024 * 4 });

    const lineStream = readline.createInterface({ input: readStream.pipe(createUnzip()) });
    const onClose = async () => {
      if (docs.length > 0) {
        try {
          await bulkInsert(docs);
        } catch (err) {
          reject(err);
          return;
        }
      }
      resolve(count);
    };
    lineStream.on('close', onClose);

    const closeWithError = (err: any) => {
      lineStream.removeListener('close', onClose);
      lineStream.close();
      reject(err);
    };

    lineStream.on('line', async line => {
      if (line.length === 0 || line.charAt(0) === '#') {
        return;
      }

      let doc;
      try {
        doc = JSON.parse(line);
      } catch (err) {
        closeWithError(
          new Error(
            `Unable to parse line as JSON document, line: """${line}""", Error: ${err.message}`
          )
        );
        return;
      }

      count++;
      docs.push(doc);

      if (docs.length >= BULK_INSERT_SIZE && !isPaused) {
        lineStream.pause();

        // readline pause is leaky and events in buffer still get sent after pause
        // need to clear buffer before async call
        const docstmp = docs.slice();
        docs = [];
        try {
          await bulkInsert(docstmp);
          lineStream.resume();
        } catch (err) {
          closeWithError(err);
        }
      }
    });

    lineStream.on('pause', async () => {
      isPaused = true;
    });

    lineStream.on('resume', async () => {
      isPaused = false;
    });
  });
}
