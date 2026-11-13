/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import { useStepNameEditor } from './use_step_name_editor';

const setup = (committedName = 'notify', siblings: readonly string[] = ['other', 'notify']) => {
  const onCommit = jest.fn();
  const hook = renderHook(
    (props: { committedName: string }) =>
      useStepNameEditor({
        committedName: props.committedName,
        siblingStepNames: new Set(siblings),
        onCommit,
      }),
    { initialProps: { committedName } }
  );
  return { ...hook, onCommit };
};

describe('useStepNameEditor', () => {
  beforeEach(() => {
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 0;
    });
  });
  afterEach(() => jest.restoreAllMocks());

  it('starts not editing, with nothing typed and no error', () => {
    const { result } = setup();
    expect(result.current.isEditing).toBe(false);
    expect(result.current.draft).toBe('');
    expect(result.current.error).toBeUndefined();
  });

  describe('begin', () => {
    it('starts editing from the name the step has', () => {
      const { result } = setup('notify');
      act(() => result.current.begin());
      expect(result.current.isEditing).toBe(true);
      expect(result.current.draft).toBe('notify');
      expect(result.current.isEditingRef.current).toBe(true);
    });

    it('focuses and selects the input once it is there', () => {
      const { result } = setup();
      const input = document.createElement('input');
      input.value = 'notify';
      document.body.appendChild(input);
      result.current.inputRef.current = input;
      const select = jest.spyOn(input, 'select');

      act(() => result.current.begin());

      expect(document.activeElement).toBe(input);
      expect(select).toHaveBeenCalled();
      input.remove();
    });

    it('clears an error left from before', () => {
      const { result } = setup();
      act(() => result.current.begin());
      act(() => result.current.changeDraft('   '));
      act(() => result.current.commit());
      expect(result.current.error).toBeDefined();

      act(() => result.current.revert());
      act(() => result.current.begin());
      expect(result.current.error).toBeUndefined();
    });
  });

  describe('commit', () => {
    it('hands over the trimmed name and stops editing', () => {
      const { result, onCommit } = setup();
      act(() => result.current.begin());
      act(() => result.current.changeDraft('  renamed  '));
      act(() => result.current.commit());

      expect(onCommit).toHaveBeenCalledWith('renamed');
      expect(result.current.isEditing).toBe(false);
      expect(result.current.error).toBeUndefined();
    });

    it('refuses an empty name, saying so, and keeps editing', () => {
      const { result, onCommit } = setup();
      act(() => result.current.begin());
      act(() => result.current.changeDraft('   '));
      act(() => result.current.commit());

      expect(onCommit).not.toHaveBeenCalled();
      expect(result.current.error).toBe('Step name is required');
      expect(result.current.isEditing).toBe(true);
    });

    it('refuses the name of another step, naming it, and keeps editing', () => {
      const { result, onCommit } = setup();
      act(() => result.current.begin());
      act(() => result.current.changeDraft('other'));
      act(() => result.current.commit());

      expect(onCommit).not.toHaveBeenCalled();
      expect(result.current.error).toBe('A step named "other" already exists');
      expect(result.current.isEditing).toBe(true);
    });

    it('accepts the name the step already had, though it is in the list of names', () => {
      const { result, onCommit } = setup('notify', ['other', 'notify']);
      act(() => result.current.begin());
      act(() => result.current.commit());

      expect(onCommit).toHaveBeenCalledWith('notify');
      expect(result.current.isEditing).toBe(false);
    });

    it('does nothing when it was not editing, as a blur after Escape would', () => {
      const { result, onCommit } = setup();
      act(() => result.current.commit());
      expect(onCommit).not.toHaveBeenCalled();
    });
  });

  describe('revert', () => {
    it('puts back the name it began with, stops editing and clears the error', () => {
      const { result, onCommit } = setup('notify');
      act(() => result.current.begin());
      act(() => result.current.changeDraft('temp'));
      act(() => result.current.revert());

      expect(result.current.isEditing).toBe(false);
      expect(result.current.draft).toBe('notify');
      expect(result.current.error).toBeUndefined();
      expect(result.current.isEditingRef.current).toBe(false);
      expect(onCommit).not.toHaveBeenCalled();
    });

    it('makes the blur that follows a no-op', () => {
      const { result, onCommit } = setup();
      act(() => result.current.begin());
      act(() => result.current.changeDraft('temp'));
      act(() => result.current.revert());
      act(() => result.current.commit());
      expect(onCommit).not.toHaveBeenCalled();
    });
  });

  describe('changeDraft', () => {
    it('updates the draft and clears the error so the next try starts clean', () => {
      const { result } = setup();
      act(() => result.current.begin());
      act(() => result.current.changeDraft(''));
      act(() => result.current.commit());
      expect(result.current.error).toBeDefined();

      act(() => result.current.changeDraft('x'));
      expect(result.current.draft).toBe('x');
      expect(result.current.error).toBeUndefined();
    });
  });

  describe('displayName', () => {
    it('is the committed name at rest, and what is being typed while editing', () => {
      const { result } = setup('notify');
      expect(result.current.displayName).toBe('notify');
      act(() => result.current.begin());
      act(() => result.current.changeDraft('  typing  '));
      expect(result.current.displayName).toBe('typing');
    });

    it('follows the committed name when it changes', () => {
      const { result, rerender } = setup('notify');
      rerender({ committedName: 'renamed' });
      expect(result.current.displayName).toBe('renamed');
    });
  });

  describe('reset', () => {
    it('leaves editing and drops the error, for when the panel is given a new step', () => {
      const { result } = setup();
      act(() => result.current.begin());
      act(() => result.current.changeDraft(''));
      act(() => result.current.commit());
      act(() => result.current.reset());

      expect(result.current.isEditing).toBe(false);
      expect(result.current.error).toBeUndefined();
    });
  });
});
