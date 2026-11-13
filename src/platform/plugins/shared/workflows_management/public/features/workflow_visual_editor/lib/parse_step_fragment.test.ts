/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isStepFragmentDirty, parseStepFragment } from './parse_step_fragment';

const STEP = `name: notify # a comment
type: slack
with:
  message: hi
  options:
    urgent: true
  tags:
    - a
    - b
`;

describe('parseStepFragment', () => {
  describe('a valid step mapping', () => {
    const parsed = parseStepFragment(STEP);

    it('is valid, with the step as plain data', () => {
      expect(parsed.valid).toBe(true);
      expect(parsed.hasErrors).toBe(false);
      expect(parsed.error).toBeUndefined();
      expect(parsed.js).toEqual({
        name: 'notify',
        type: 'slack',
        with: { message: 'hi', options: { urgent: true }, tags: ['a', 'b'] },
      });
    });

    it('keeps the text it was parsed from', () => {
      expect(parsed.text).toBe(STEP);
    });

    it('reads a value by path', () => {
      expect(parsed.read(['name'])).toBe('notify');
      expect(parsed.read(['with', 'message'])).toBe('hi');
      expect(parsed.read(['with', 'options', 'urgent'])).toBe(true);
    });

    it('reads a whole branch as plain data', () => {
      expect(parsed.read(['with', 'options'])).toEqual({ urgent: true });
      expect(parsed.read(['with', 'tags'])).toEqual(['a', 'b']);
    });

    it('reads nothing for a path that is not there', () => {
      expect(parsed.read(['missing'])).toBeUndefined();
      expect(parsed.read(['with', 'missing', 'deeper'])).toBeUndefined();
    });

    it('reads nothing through a scalar', () => {
      expect(parsed.read(['name', 'deeper'])).toBeUndefined();
    });

    it('hands out the same value on every read, so consumers can compare by identity', () => {
      expect(parsed.read(['with', 'options'])).toBe(parsed.read(['with', 'options']));
    });
  });

  describe('YAML with errors', () => {
    const parsed = parseStepFragment('name: notify\nwith: [unclosed\n');

    it('is not valid, and says why', () => {
      expect(parsed.valid).toBe(false);
      expect(parsed.hasErrors).toBe(true);
      expect(parsed.js).toBeUndefined();
      expect(parsed.error).toEqual(expect.any(String));
    });

    it('still reads what the parser recovered, as the panel always has', () => {
      expect(parsed.read(['name'])).toBe('notify');
    });
  });

  describe('something other than a mapping', () => {
    it.each([
      ['a scalar', 'just text'],
      ['a list', '- a\n- b\n'],
      ['nothing', ''],
    ])('is not valid for %s, and reads nothing', (_label, text) => {
      const parsed = parseStepFragment(text);
      expect(parsed.valid).toBe(false);
      expect(parsed.js).toBeUndefined();
      expect(parsed.read(['name'])).toBeUndefined();
    });

    it('still holds the data, for comparing two drafts', () => {
      expect(parseStepFragment('just text').data).toBe('just text');
      expect(parseStepFragment('- a\n- b\n').data).toEqual(['a', 'b']);
    });
  });

  it('parses the text once, however many values are read', () => {
    const parsed = parseStepFragment(STEP);
    const reads = [['name'], ['type'], ['with', 'message'], ['with', 'tags']] as const;
    expect(reads.map((path) => parsed.read(path))).toEqual(['notify', 'slack', 'hi', ['a', 'b']]);
  });
});

describe('isStepFragmentDirty', () => {
  const dirty = (draft: string, applied: string) =>
    isStepFragmentDirty(parseStepFragment(draft), parseStepFragment(applied));

  it('is clean for identical text', () => {
    expect(dirty(STEP, STEP)).toBe(false);
  });

  it('is dirty when a value changed', () => {
    expect(dirty(STEP.replace('hi', 'hello'), STEP)).toBe(true);
  });

  it('is clean when only comments or formatting changed', () => {
    expect(dirty(STEP.replace('# a comment', '# another'), STEP)).toBe(false);
    expect(dirty(STEP.replace('name: notify', 'name:   notify'), STEP)).toBe(false);
  });

  it('is clean when only the order of keys changed', () => {
    expect(dirty('type: slack\nname: notify\n', 'name: notify\ntype: slack\n')).toBe(false);
  });

  it('is dirty when a key was added or removed', () => {
    expect(dirty(`${STEP}timeout: 1m\n`, STEP)).toBe(true);
    expect(dirty('name: notify\n', STEP)).toBe(true);
  });

  it('is dirty when either side has YAML errors and the text differs', () => {
    expect(dirty('name: notify\nwith: [unclosed\n', STEP)).toBe(true);
    expect(dirty(STEP, 'name: notify\nwith: [unclosed\n')).toBe(true);
  });

  it('is clean when both have the same broken text', () => {
    const broken = 'name: notify\nwith: [unclosed\n';
    expect(dirty(broken, broken)).toBe(false);
  });
});
