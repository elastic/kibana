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

import sinon from 'sinon';
import { PassThrough } from 'stream';

import { confirm, question } from './prompt';

describe('prompt', () => {
  const sandbox = sinon.createSandbox();

  let input;
  let output;

  beforeEach(() => {
    input = new PassThrough();
    output = new PassThrough();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('confirm', () => {
    it('prompts for question', async () => {
      const onData = sandbox.stub(output, 'write');

      confirm('my question', { output });

      sinon.assert.calledOnce(onData);

      const { args } = onData.getCall(0);
      expect(args[0]).toEqual('my question [y/N] ');
    });

    it('prompts for question with default true', async () => {
      const onData = sandbox.stub(output, 'write');

      confirm('my question', { output, default: true });

      sinon.assert.calledOnce(onData);

      const { args } = onData.getCall(0);
      expect(args[0]).toEqual('my question [Y/n] ');
    });

    it('defaults to false', async () => {
      process.nextTick(() => input.write('\n'));

      const answer = await confirm('my question', { output, input });
      expect(answer).toBe(false);
    });

    it('accepts "y"', async () => {
      process.nextTick(() => input.write('y\n'));

      const answer = await confirm('my question', { output, input });
      expect(answer).toBe(true);
    });

    it('accepts "Y"', async () => {
      process.nextTick(() => input.write('Y\n'));

      const answer = await confirm('my question', { output, input });
      expect(answer).toBe(true);
    });

    it('accepts "yes"', async () => {
      process.nextTick(() => input.write('yes\n'));

      const answer = await confirm('my question', { output, input });
      expect(answer).toBe(true);
    });

    it('is false when unknown', async () => {
      process.nextTick(() => input.write('unknown\n'));

      const answer = await confirm('my question', { output, input });
      expect(answer).toBe(false);
    });
  });

  describe('question', () => {
    it('prompts for question', async () => {
      const onData = sandbox.stub(output, 'write');

      question('my question', { output });

      sinon.assert.calledOnce(onData);

      const { args } = onData.getCall(0);
      expect(args[0]).toEqual('my question: ');
    });

    it('can be answered', async () => {
      process.nextTick(() => input.write('my answer\n'));

      const answer = await question('my question', { input, output });
      expect(answer).toBe('my answer');
    });
  });
});
