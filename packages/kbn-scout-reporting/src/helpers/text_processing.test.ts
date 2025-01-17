/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import stripANSI from 'strip-ansi';
import { parseStdout } from './text_processing';

jest.mock('strip-ansi', () => jest.fn((input) => input.replace(/\x1b\[[0-9;]*m/g, '')));

describe('text_processing', () => {
  describe('parseStdout', () => {
    it('should concatenate multiple strings and strip ANSI codes', () => {
      const stdout = ['Line 1 with ANSI \x1b[31mred\x1b[0m text', '\nLine 2 plain text'];
      const result = parseStdout(stdout);

      expect(stripANSI).toHaveBeenCalledWith(
        'Line 1 with ANSI \x1b[31mred\x1b[0m text\nLine 2 plain text'
      );
      expect(result).toBe('Line 1 with ANSI red text\nLine 2 plain text');
    });

    it('should concatenate multiple buffers and strip ANSI codes', () => {
      const stdout = [
        Buffer.from('Buffer line 1 with ANSI \x1b[32mgreen\x1b[0m text'),
        Buffer.from('\nBuffer line 2 plain text'),
      ];
      const result = parseStdout(stdout);

      expect(stripANSI).toHaveBeenCalledWith(
        'Buffer line 1 with ANSI \x1b[32mgreen\x1b[0m text\nBuffer line 2 plain text'
      );
      expect(result).toBe('Buffer line 1 with ANSI green text\nBuffer line 2 plain text');
    });

    it('should handle an empty array and return an empty string', () => {
      const stdout: Array<string | Buffer> = [];
      const result = parseStdout(stdout);

      expect(stripANSI).toHaveBeenCalledWith('');
      expect(result).toBe('');
    });

    it('should handle an array with only an empty string', () => {
      const stdout = [''];
      const result = parseStdout(stdout);

      expect(stripANSI).toHaveBeenCalledWith('');
      expect(result).toBe('');
    });

    it('should handle an array with only an empty buffer', () => {
      const stdout = [Buffer.from('')];
      const result = parseStdout(stdout);

      expect(stripANSI).toHaveBeenCalledWith('');
      expect(result).toBe('');
    });
  });
});
