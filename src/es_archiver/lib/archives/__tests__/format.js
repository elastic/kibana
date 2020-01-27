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

import Stream from 'stream';
import { createGunzip } from 'zlib';

import expect from '@kbn/expect';

import {
  createListStream,
  createPromiseFromStreams,
  createConcatStream,
} from '../../../../legacy/utils';

import { createFormatArchiveStreams } from '../format';

const INPUTS = [1, 2, { foo: 'bar' }, [1, 2]];
const INPUT_JSON = INPUTS.map(i => JSON.stringify(i, null, 2)).join('\n\n');

describe('esArchiver createFormatArchiveStreams', () => {
  describe('{ gzip: false }', () => {
    it('returns an array of streams', () => {
      const streams = createFormatArchiveStreams({ gzip: false });
      expect(streams).to.be.an('array');
      expect(streams.length).to.be.greaterThan(0);
      streams.forEach(s => expect(s).to.be.a(Stream));
    });

    it('streams consume js values and produces buffers', async () => {
      const output = await createPromiseFromStreams([
        createListStream(INPUTS),
        ...createFormatArchiveStreams({ gzip: false }),
        createConcatStream([]),
      ]);

      expect(output.length).to.be.greaterThan(0);
      output.forEach(b => expect(b).to.be.a(Buffer));
    });

    it('product is pretty-printed JSON separated by two newlines', async () => {
      const json = await createPromiseFromStreams([
        createListStream(INPUTS),
        ...createFormatArchiveStreams({ gzip: false }),
        createConcatStream(''),
      ]);

      expect(json).to.be(INPUT_JSON);
    });
  });

  describe('{ gzip: true }', () => {
    it('returns an array of streams', () => {
      const streams = createFormatArchiveStreams({ gzip: true });
      expect(streams).to.be.an('array');
      expect(streams.length).to.be.greaterThan(0);
      streams.forEach(s => expect(s).to.be.a(Stream));
    });

    it('streams consume js values and produces buffers', async () => {
      const output = await createPromiseFromStreams([
        createListStream([1, 2, { foo: 'bar' }, [1, 2]]),
        ...createFormatArchiveStreams({ gzip: true }),
        createConcatStream([]),
      ]);

      expect(output.length).to.be.greaterThan(0);
      output.forEach(b => expect(b).to.be.a(Buffer));
    });

    it('output can be gunzipped', async () => {
      const output = await createPromiseFromStreams([
        createListStream(INPUTS),
        ...createFormatArchiveStreams({ gzip: true }),
        createGunzip(),
        createConcatStream(''),
      ]);
      expect(output).to.be(INPUT_JSON);
    });
  });

  describe('defaults', () => {
    it('product is not gzipped', async () => {
      const json = await createPromiseFromStreams([
        createListStream(INPUTS),
        ...createFormatArchiveStreams(),
        createConcatStream(''),
      ]);

      expect(json).to.be(INPUT_JSON);
    });
  });
});
