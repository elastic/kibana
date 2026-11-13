/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import { detectIndent, writeFragmentValue } from './fragment_yaml';
import type { StepFormField } from './step_form_schema';

const field = (path: readonly string[], overrides: Partial<StepFormField> = {}): StepFormField => ({
  key: path[path.length - 1],
  path,
  label: path[path.length - 1],
  required: false,
  kind: 'text',
  ...overrides,
});

const toJs = (yaml: string) => parseDocument(yaml).toJS();

const STEP = `name: notify # keep me
type: slack
x-owner: team-a
with:
  message: hi
  count: 5
`;

describe('detectIndent', () => {
  it.each([
    ['two spaces', 'a:\n  b: 1\n', 2],
    ['four spaces', 'a:\n    b: 1\n', 4],
    ['the first indented line, whichever later ones do', 'a:\n   b: 1\n  c: 2\n', 3],
    ['nothing indented', 'a: 1\nb: 2\n', 2],
    ['an empty text', '', 2],
  ])('is read from %s', (_label, yaml, expected) => {
    expect(detectIndent(yaml)).toBe(expected);
  });
});

describe('writeFragmentValue', () => {
  describe('setting a value', () => {
    it('writes the value at its path', () => {
      expect(toJs(writeFragmentValue(STEP, field(['with', 'message']), 'bye', 2))).toMatchObject({
        with: { message: 'bye', count: 5 },
      });
    });

    it('writes a root key', () => {
      expect(toJs(writeFragmentValue(STEP, field(['timeout']), '30s', 2))).toMatchObject({
        timeout: '30s',
        name: 'notify',
      });
    });

    it('creates the mapping a key lives in when it is missing', () => {
      const out = writeFragmentValue('name: a\ntype: x\n', field(['with', 'message']), 'hi', 2);
      expect(toJs(out)).toEqual({ name: 'a', type: 'x', with: { message: 'hi' } });
    });

    it('keeps comments and keys the form does not own', () => {
      const out = writeFragmentValue(STEP, field(['with', 'message']), 'bye', 2);
      expect(out).toContain('# keep me');
      expect(out).toContain('x-owner: team-a');
    });

    it('writes structured values as YAML', () => {
      const out = writeFragmentValue(STEP, field(['with', 'query']), { a: [1, 2] }, 2);
      expect(toJs(out)).toMatchObject({ with: { query: { a: [1, 2] } } });
    });

    it('indents by the amount given', () => {
      expect(writeFragmentValue('name: a\n', field(['with', 'x']), 'y', 4)).toContain('\n    x: y');
    });

    it('does not fold a long line', () => {
      const long = 'word '.repeat(60).trim();
      const out = writeFragmentValue('name: a\n', field(['with', 'x']), long, 2);
      expect(toJs(out)).toMatchObject({ with: { x: long } });
      // `name`, `with` and the one line of `x`: nothing was folded onto more lines.
      expect(out.trim().split('\n')).toHaveLength(3);
    });
  });

  describe('clearing a value', () => {
    it.each([
      ['undefined', undefined],
      ['null', null],
      ['an empty list', []],
      ['an empty map', {}],
    ])('removes an optional key when it becomes %s', (_label, value) => {
      const out = writeFragmentValue(STEP, field(['with', 'count']), value, 2);
      expect(toJs(out)).toMatchObject({ with: { message: 'hi' } });
      expect(toJs(out).with).not.toHaveProperty('count');
    });

    it('keeps an optional key as an empty string, which is how a field stays in expression mode', () => {
      const out = writeFragmentValue(STEP, field(['with', 'message']), '', 2);
      expect(toJs(out).with).toHaveProperty('message', '');
    });

    it('removes that key when the field says clearing deletes it', () => {
      const out = writeFragmentValue(
        STEP,
        field(['with', 'message'], { deleteWhenEmpty: true }),
        '',
        2
      );
      expect(toJs(out).with).not.toHaveProperty('message');
    });

    it('never removes a required key, it keeps it empty', () => {
      const out = writeFragmentValue(
        STEP,
        field(['with', 'message'], { required: true }),
        undefined,
        2
      );
      expect(toJs(out).with).toHaveProperty('message');
    });

    it('does nothing for a key whose parent mapping is not there', () => {
      const out = writeFragmentValue('name: a\n', field(['with', 'count']), undefined, 2);
      expect(toJs(out)).toEqual({ name: 'a' });
    });
  });

  describe('text that is not a step mapping', () => {
    it.each([
      ['a scalar', 'just text'],
      ['a list', '- a\n- b\n'],
      ['nothing', ''],
    ])('is returned as it was for %s', (_label, text) => {
      expect(writeFragmentValue(text, field(['with', 'x']), 'y', 2)).toBe(text);
    });
  });
});
