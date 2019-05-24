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
    const result = await collectSavedObjects({ readStream, objectLimit: 10, supportedTypes: [] });
    expect(result).toMatchInlineSnapshot(`
Object {
  "collectedObjects": Array [],
  "errors": Array [],
}
`);
  });

  test('collects objects from stream', async () => {
    const readStream = new Readable({
      read() {
        this.push('{"foo":true,"type":"a"}');
        this.push(null);
      },
    });
    const result = await collectSavedObjects({
      readStream,
      objectLimit: 1,
      supportedTypes: ['a'],
    });
    expect(result).toMatchInlineSnapshot(`
Object {
  "collectedObjects": Array [
    Object {
      "foo": true,
      "migrationVersion": Object {},
      "type": "a",
    },
  ],
  "errors": Array [],
}
`);
  });

  test('filters out empty lines', async () => {
    const readStream = new Readable({
      read() {
        this.push('{"foo":true,"type":"a"}\n\n');
        this.push(null);
      },
    });
    const result = await collectSavedObjects({
      readStream,
      objectLimit: 1,
      supportedTypes: ['a'],
    });
    expect(result).toMatchInlineSnapshot(`
Object {
  "collectedObjects": Array [
    Object {
      "foo": true,
      "migrationVersion": Object {},
      "type": "a",
    },
  ],
  "errors": Array [],
}
`);
  });

  test('throws error when object limit is reached', async () => {
    const readStream = new Readable({
      read() {
        this.push('{"foo":true,"type":"a"}\n');
        this.push('{"bar":true,"type":"a"}\n');
        this.push(null);
      },
    });
    await expect(
      collectSavedObjects({
        readStream,
        objectLimit: 1,
        supportedTypes: ['a'],
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Can't import more than 1 objects"`);
  });

  test('unsupported types return as import errors', async () => {
    const readStream = new Readable({
      read() {
        this.push('{"id":"1","type":"a","attributes":{"title":"my title"}}\n');
        this.push('{"id":"2","type":"b","attributes":{"title":"my title 2"}}\n');
        this.push(null);
      },
    });
    const result = await collectSavedObjects({ readStream, objectLimit: 2, supportedTypes: ['1'] });
    expect(result).toMatchInlineSnapshot(`
Object {
  "collectedObjects": Array [],
  "errors": Array [
    Object {
      "error": Object {
        "type": "unsupported_type",
      },
      "id": "1",
      "title": "my title",
      "type": "a",
    },
    Object {
      "error": Object {
        "type": "unsupported_type",
      },
      "id": "2",
      "title": "my title 2",
      "type": "b",
    },
  ],
}
`);
  });

  test('unsupported types still count towards object limit', async () => {
    const readStream = new Readable({
      read() {
        this.push('{"foo":true,"type":"a"}\n');
        this.push('{"bar":true,"type":"b"}\n');
        this.push(null);
      },
    });
    await expect(
      collectSavedObjects({
        readStream,
        objectLimit: 1,
        supportedTypes: ['a'],
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Can't import more than 1 objects"`);
  });
});
