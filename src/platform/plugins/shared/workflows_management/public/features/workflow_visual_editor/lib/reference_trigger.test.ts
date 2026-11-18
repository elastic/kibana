/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  caretInTrigger,
  keepTrigger,
  openTrigger,
  triggerQuery,
  triggerRange,
  type TriggerSession,
} from './reference_trigger';

describe('openTrigger', () => {
  describe('a typed {', () => {
    it('opens on a single { where { is not syntax', () => {
      expect(openTrigger({ text: 'Hi {', caret: 4, typed: '{', openOnBrace: true })).toEqual({
        start: 3,
        triggerLength: 1,
      });
    });

    it('does not open on a single { where { is syntax (JSON, KQL, ES|QL)', () => {
      expect(
        openTrigger({ text: 'Hi {', caret: 4, typed: '{', openOnBrace: false })
      ).toBeUndefined();
    });

    it.each([true, false])('opens on {{ (openOnBrace %s), covering both braces', (openOnBrace) => {
      expect(openTrigger({ text: 'Hi {{', caret: 5, typed: '{', openOnBrace })).toEqual({
        start: 3,
        triggerLength: 2,
      });
    });

    it('opens on {{ at the very start of the text', () => {
      expect(openTrigger({ text: '{{', caret: 2, typed: '{', openOnBrace: false })).toEqual({
        start: 0,
        triggerLength: 2,
      });
    });
  });

  describe('anything that is not a typed {', () => {
    it('never opens when a character was deleted, even if {{ is left before the caret', () => {
      expect(
        openTrigger({ text: '{{', caret: 2, typed: undefined, openOnBrace: true })
      ).toBeUndefined();
    });

    it('never opens on a paste or an undo, which are not a single typed character', () => {
      expect(
        openTrigger({ text: 'a {{', caret: 4, typed: undefined, openOnBrace: true })
      ).toBeUndefined();
    });

    it('does not open on any other typed character, @ included', () => {
      expect(
        openTrigger({ text: 'mail @', caret: 6, typed: '@', openOnBrace: true })
      ).toBeUndefined();
      expect(openTrigger({ text: '{{a', caret: 3, typed: 'a', openOnBrace: true })).toBeUndefined();
    });
  });
});

describe('keepTrigger', () => {
  const braces: TriggerSession = { start: 0, triggerLength: 2 };
  const brace: TriggerSession = { start: 0, triggerLength: 1 };

  it('keeps the same session while a variable is typed after {{', () => {
    expect(keepTrigger(braces, { text: '{{ aaa', caret: 6, typed: 'a' })).toEqual(braces);
  });

  it('widens a one-brace session when the second { is typed, instead of opening a new one', () => {
    expect(keepTrigger(brace, { text: '{{', caret: 2, typed: '{' })).toEqual({
      start: 0,
      triggerLength: 2,
    });
  });

  it('keeps the session when characters after the trigger are deleted', () => {
    expect(keepTrigger(braces, { text: '{{', caret: 2, typed: undefined })).toEqual(braces);
  });

  it('closes when the trigger itself is deleted', () => {
    expect(keepTrigger(braces, { text: '{', caret: 1, typed: undefined })).toBeUndefined();
    expect(keepTrigger(brace, { text: '', caret: 0, typed: undefined })).toBeUndefined();
  });

  it('closes when the caret moves before the trigger', () => {
    expect(
      keepTrigger({ start: 3, triggerLength: 2 }, { text: 'Hi {{ a', caret: 1, typed: undefined })
    ).toBeUndefined();
  });

  it('closes when the trigger characters were edited', () => {
    expect(keepTrigger(braces, { text: '[{ aaa', caret: 6, typed: undefined })).toBeUndefined();
  });

  it('closes once the reference is closed or the line ends', () => {
    expect(keepTrigger(braces, { text: '{{ a }', caret: 6, typed: '}' })).toBeUndefined();
    expect(keepTrigger(braces, { text: '{{ a\n', caret: 5, typed: undefined })).toBeUndefined();
  });

  it('keeps a session that was opened by the button, which has no trigger characters', () => {
    const button: TriggerSession = { start: 4, triggerLength: 0 };
    expect(keepTrigger(button, { text: 'abc aaa', caret: 7, typed: 'a' })).toEqual(button);
    expect(keepTrigger(button, { text: 'abc', caret: 3, typed: undefined })).toBeUndefined();
  });
});

describe('caretInTrigger', () => {
  const braces: TriggerSession = { start: 0, triggerLength: 2 };

  it('holds while the caret is somewhere after the trigger on the same reference', () => {
    expect(caretInTrigger(braces, '{{ aaa', 6)).toBe(true);
    expect(caretInTrigger(braces, '{{ aaa', 3)).toBe(true);
    expect(caretInTrigger(braces, '{{ aaa', 2)).toBe(true);
  });

  it('is over once the caret is inside or before the trigger', () => {
    expect(caretInTrigger(braces, '{{ aaa', 1)).toBe(false);
    expect(caretInTrigger(braces, '{{ aaa', 0)).toBe(false);
  });

  it('is over once the caret has moved past a closing brace', () => {
    expect(caretInTrigger(braces, '{{ a }} b', 9)).toBe(false);
    expect(caretInTrigger(braces, '{{ a }} b', 4)).toBe(true);
  });

  it('does not look at the trigger characters, which a caret move cannot change', () => {
    expect(caretInTrigger(braces, 'stale text', 4)).toBe(true);
  });
});

describe('triggerQuery', () => {
  it('is what was typed after the trigger, without the padding space', () => {
    expect(triggerQuery({ start: 0, triggerLength: 2 }, '{{ aaa', 6)).toBe('aaa');
    expect(triggerQuery({ start: 0, triggerLength: 2 }, '{{', 2)).toBe('');
    expect(triggerQuery({ start: 3, triggerLength: 1 }, 'Hi {steps.a', 11)).toBe('steps.a');
  });

  it('stops at the caret, ignoring the text after it', () => {
    expect(triggerQuery({ start: 0, triggerLength: 2 }, '{{ ab }}', 5)).toBe('ab');
  });

  it('is what was typed since the button was pressed', () => {
    expect(triggerQuery({ start: 3, triggerLength: 0 }, 'abcxyz', 6)).toBe('xyz');
  });
});

describe('triggerRange', () => {
  it('replaces from the trigger to the caret, so what was typed goes with it', () => {
    expect(triggerRange({ start: 3, triggerLength: 2 }, 'Hi {{ aaa', 9)).toEqual({
      start: 3,
      end: 9,
    });
  });

  it('also replaces a closing }} that directly follows the caret', () => {
    expect(triggerRange({ start: 0, triggerLength: 2 }, '{{ ab }} rest', 5)).toEqual({
      start: 0,
      end: 8,
    });
  });

  it('leaves text after the caret alone when it is not a closing }}', () => {
    expect(triggerRange({ start: 0, triggerLength: 2 }, '{{ ab rest', 5)).toEqual({
      start: 0,
      end: 5,
    });
  });
});
