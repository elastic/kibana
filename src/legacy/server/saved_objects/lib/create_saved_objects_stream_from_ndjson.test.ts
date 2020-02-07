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

import { createSavedObjectsStreamFromNdJson } from './create_saved_objects_stream_from_ndjson';
import { Readable } from 'stream';
import { createPromiseFromStreams, createConcatStream } from '../../../utils/streams';

async function readStreamToCompletion(stream: Readable) {
  return createPromiseFromStreams([stream, createConcatStream([])]);
}

describe('createSavedObjectsStreamFromNdJson', () => {
  it('transforms an ndjson stream into a stream of saved objects', async () => {
    const savedObjectsStream = createSavedObjectsStreamFromNdJson(
      new Readable({
        read() {
          this.push('{"id": "foo", "type": "foo-type"}\n');
          this.push('{"id": "bar", "type": "bar-type"}\n');
          this.push(null);
        },
      })
    );

    const result = await readStreamToCompletion(savedObjectsStream);

    expect(result).toEqual([
      {
        id: 'foo',
        type: 'foo-type',
      },
      {
        id: 'bar',
        type: 'bar-type',
      },
    ]);
  });

  it('skips empty lines', async () => {
    const savedObjectsStream = createSavedObjectsStreamFromNdJson(
      new Readable({
        read() {
          this.push('{"id": "foo", "type": "foo-type"}\n');
          this.push('\n');
          this.push('');
          this.push('{"id": "bar", "type": "bar-type"}\n');
          this.push(null);
        },
      })
    );

    const result = await readStreamToCompletion(savedObjectsStream);

    expect(result).toEqual([
      {
        id: 'foo',
        type: 'foo-type',
      },
      {
        id: 'bar',
        type: 'bar-type',
      },
    ]);
  });

  it('filters the export details entry from the stream', async () => {
    const savedObjectsStream = createSavedObjectsStreamFromNdJson(
      new Readable({
        read() {
          this.push('{"id": "foo", "type": "foo-type"}\n');
          this.push('{"id": "bar", "type": "bar-type"}\n');
          this.push('{"exportedCount": 2, "missingRefCount": 0, "missingReferences": []}\n');
          this.push(null);
        },
      })
    );

    const result = await readStreamToCompletion(savedObjectsStream);

    expect(result).toEqual([
      {
        id: 'foo',
        type: 'foo-type',
      },
      {
        id: 'bar',
        type: 'bar-type',
      },
    ]);
  });
});
