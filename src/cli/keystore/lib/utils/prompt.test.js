/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PassThrough } from 'stream';

import { confirm, question } from './prompt';

describe('prompt', () => {
  let input;
  let output;

  beforeEach(() => {
    input = new PassThrough();
    output = new PassThrough();
  });

  afterEach(() => {
    input.end();
    output.end();
  });

  describe('confirm', () => {
    it('prompts for question', async () => {
      const write = jest.spyOn(output, 'write');

      process.nextTick(() => input.write('Y\n'));
      await confirm('my question', { input, output });

      expect(write).toHaveBeenCalledWith('my question [y/N] ');
    });

    it('prompts for question with default true', async () => {
      const write = jest.spyOn(output, 'write');

      process.nextTick(() => input.write('Y\n'));
      await confirm('my question', { input, output, default: true });

      expect(write).toHaveBeenCalledWith('my question [Y/n] ');
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
      const write = jest.spyOn(output, 'write');

      process.nextTick(() => input.write('my answer\n'));
      await question('my question', { input, output });

      expect(write).toHaveBeenCalledWith('my question: ');
    });

    it('can be answered', async () => {
      process.nextTick(() => input.write('my answer\n'));

      const answer = await question('my question', { input, output });
      expect(answer).toBe('my answer');
    });
  });
});
