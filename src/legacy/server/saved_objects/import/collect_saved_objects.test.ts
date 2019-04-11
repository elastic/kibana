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

import { Readable } from 'stream';
import { collectSavedObjects } from './collect_saved_objects';

describe('collectSavedObjects()', () => {
  test('collects nothing when stream is empty', async () => {
    const readStream = new Readable({
      read() {
        this.push(null);
      },
    });
    const objects = await collectSavedObjects(readStream, 10);
    expect(objects).toMatchInlineSnapshot(`Array []`);
  });

  test('collects objects from stream', async () => {
    const readStream = new Readable({
      read() {
        this.push('{"foo":true}');
        this.push(null);
      },
    });
    const objects = await collectSavedObjects(readStream, 1);
    expect(objects).toMatchInlineSnapshot(`
Array [
  Object {
    "foo": true,
    "migrationVersion": Object {},
  },
]
`);
  });

  test('filters out empty lines', async () => {
    const readStream = new Readable({
      read() {
        this.push('{"foo":true}\n\n');
        this.push(null);
      },
    });
    const objects = await collectSavedObjects(readStream, 1);
    expect(objects).toMatchInlineSnapshot(`
Array [
  Object {
    "foo": true,
    "migrationVersion": Object {},
  },
]
`);
  });

  test('throws error when object limit is reached', async () => {
    const readStream = new Readable({
      read() {
        this.push('{"foo":true}\n');
        this.push('{"bar":true}\n');
        this.push(null);
      },
    });
    await expect(collectSavedObjects(readStream, 1)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Can't import more than 1 objects"`
    );
  });
});
