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

jest.doMock('fs', () => ({
  createReadStream(filepath: string): Readable {
    if (filepath === 'ERROR') {
      throw new Error('MOCK ERROR - Invalid Path');
    }
    const readableStream = new Readable();
    const streamData = filepath.split('');
    let cursor = 0;

    readableStream._read = function (size) {
      const current = streamData[cursor++];
      if (typeof current === 'undefined') {
        return this.push(null);
      }
      this.push(current);
    };

    return readableStream;
  },
}));
