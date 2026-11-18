/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createMonacoSelectionBridge } from './create_monaco_selection_bridge';
import { createFakeMonacoEditor } from '../test_utils/fake_monaco_editor';

const TEXT = 'first line\nsecond line';

describe('createMonacoSelectionBridge', () => {
  describe('getCaret', () => {
    it('is the offset of the editor position', () => {
      const fake = createFakeMonacoEditor(TEXT, { position: { lineNumber: 2, column: 3 } });
      const bridge = createMonacoSelectionBridge(fake.editor, () => -1);
      // `first line` + the line break + two characters of the second line.
      expect(bridge.getCaret()).toBe(13);
    });

    it('asks the fallback when the editor has no position yet', () => {
      const fake = createFakeMonacoEditor(TEXT, { position: null });
      const bridge = createMonacoSelectionBridge(fake.editor, () => 7);
      expect(bridge.getCaret()).toBe(7);
    });

    it('asks the fallback when the editor has no model', () => {
      const fake = createFakeMonacoEditor(TEXT, { withModel: false });
      const bridge = createMonacoSelectionBridge(fake.editor, () => 4);
      expect(bridge.getCaret()).toBe(4);
    });
  });

  describe('setCaret', () => {
    it('moves the caret, reveals it and focuses the editor', () => {
      const fake = createFakeMonacoEditor(TEXT);
      const bridge = createMonacoSelectionBridge(fake.editor, () => 0);
      bridge.setCaret(13);
      expect(fake.getPosition()).toEqual({ lineNumber: 2, column: 3 });
      expect(fake.revealPosition).toHaveBeenCalledWith({ lineNumber: 2, column: 3 });
      expect(fake.focus).toHaveBeenCalledTimes(1);
    });

    it('clamps an offset past the end to the end of the text', () => {
      const fake = createFakeMonacoEditor(TEXT);
      const bridge = createMonacoSelectionBridge(fake.editor, () => 0);
      bridge.setCaret(999);
      expect(fake.getPosition()).toEqual({ lineNumber: 2, column: 12 });
    });

    it('clamps a negative offset to the start of the text', () => {
      const fake = createFakeMonacoEditor(TEXT, { position: { lineNumber: 2, column: 5 } });
      const bridge = createMonacoSelectionBridge(fake.editor, () => 0);
      bridge.setCaret(-3);
      expect(fake.getPosition()).toEqual({ lineNumber: 1, column: 1 });
    });

    it('does nothing without a model', () => {
      const fake = createFakeMonacoEditor(TEXT, { withModel: false });
      const bridge = createMonacoSelectionBridge(fake.editor, () => 0);
      bridge.setCaret(3);
      expect(fake.revealPosition).not.toHaveBeenCalled();
      expect(fake.focus).not.toHaveBeenCalled();
    });
  });

  describe('replaceText', () => {
    it('edits through executeEdits, so the insertion joins the editor undo stack', () => {
      const fake = createFakeMonacoEditor('Hello world');
      const bridge = createMonacoSelectionBridge(fake.editor, () => 0);
      expect(bridge.replaceText?.(6, 11, '{{ a }}')).toBe(true);
      expect(fake.executeEdits).toHaveBeenCalledTimes(1);
      const [source, edits] = fake.executeEdits.mock.calls[0];
      expect(source).toBe('workflow-data-reference');
      expect(edits).toEqual([
        {
          range: { startLineNumber: 1, startColumn: 7, endLineNumber: 1, endColumn: 12 },
          text: '{{ a }}',
          forceMoveMarkers: true,
        },
      ]);
      expect(fake.getText()).toBe('Hello {{ a }}');
    });

    it('puts the caret right after the inserted text and focuses the editor', () => {
      const fake = createFakeMonacoEditor('Hello world');
      const bridge = createMonacoSelectionBridge(fake.editor, () => 0);
      bridge.replaceText?.(6, 11, '{{ a }}');
      expect(fake.getPosition()).toEqual({ lineNumber: 1, column: 14 });
      expect(fake.revealPosition).toHaveBeenCalledWith({ lineNumber: 1, column: 14 });
      expect(fake.focus).toHaveBeenCalled();
    });

    it('maps offsets on a later line to line and column', () => {
      const fake = createFakeMonacoEditor(TEXT);
      const bridge = createMonacoSelectionBridge(fake.editor, () => 0);
      bridge.replaceText?.(11, 17, 'X');
      expect(fake.getText()).toBe('first line\nX line');
    });

    it('replaces nothing but inserts when the range is collapsed', () => {
      const fake = createFakeMonacoEditor('ab');
      const bridge = createMonacoSelectionBridge(fake.editor, () => 0);
      bridge.replaceText?.(1, 1, '--');
      expect(fake.getText()).toBe('a--b');
    });

    it('clamps a range that is out of bounds', () => {
      const fake = createFakeMonacoEditor('abc');
      const bridge = createMonacoSelectionBridge(fake.editor, () => 0);
      bridge.replaceText?.(-5, 99, 'Z');
      expect(fake.getText()).toBe('Z');
    });

    it('reports false, and edits nothing, without a model', () => {
      const fake = createFakeMonacoEditor('abc', { withModel: false });
      const bridge = createMonacoSelectionBridge(fake.editor, () => 0);
      expect(bridge.replaceText?.(0, 1, 'Z')).toBe(false);
      expect(fake.executeEdits).not.toHaveBeenCalled();
    });
  });

  describe('focus', () => {
    it('focuses the editor', () => {
      const fake = createFakeMonacoEditor(TEXT);
      createMonacoSelectionBridge(fake.editor, () => 0).focus();
      expect(fake.focus).toHaveBeenCalledTimes(1);
    });
  });

  describe('listen', () => {
    const events = () => ({ onKeyDown: jest.fn(), onCaretChange: jest.fn(), onBlur: jest.fn() });

    it('passes the editor keys on, with ways to stop them from reaching the editor', () => {
      const fake = createFakeMonacoEditor(TEXT);
      const handlers = events();
      handlers.onKeyDown.mockImplementation((event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      createMonacoSelectionBridge(fake.editor, () => 0).listen?.(handlers);

      const outcome = fake.pressKey('Enter');

      expect(handlers.onKeyDown).toHaveBeenCalledWith(expect.objectContaining({ key: 'Enter' }));
      expect(outcome).toEqual({ defaultPrevented: true, propagationStopped: true });
    });

    it('tells whether a key belongs to an input method composition', () => {
      const fake = createFakeMonacoEditor(TEXT);
      const handlers = events();
      createMonacoSelectionBridge(fake.editor, () => 0).listen?.(handlers);

      fake.pressKey('Enter', { isComposing: true });
      fake.pressKey('Enter');

      expect(handlers.onKeyDown).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ key: 'Enter', isComposing: true })
      );
      expect(handlers.onKeyDown).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ key: 'Enter', isComposing: false })
      );
    });

    it('hears a key before the editor and its wrappers do, so one the dropdown used never reaches them', () => {
      const fake = createFakeMonacoEditor(TEXT);
      const handlers = events();
      handlers.onKeyDown.mockImplementation((event) => event.stopPropagation());
      createMonacoSelectionBridge(fake.editor, () => 0).listen?.(handlers);
      const editorsOwn = jest.fn();
      fake.input.addEventListener('keydown', editorsOwn);

      fake.pressKey('Escape');

      expect(editorsOwn).not.toHaveBeenCalled();
    });

    it('leaves a key it did not stop to the editor', () => {
      const fake = createFakeMonacoEditor(TEXT);
      createMonacoSelectionBridge(fake.editor, () => 0).listen?.(events());
      const editorsOwn = jest.fn();
      fake.input.addEventListener('keydown', editorsOwn);

      fake.pressKey('a');

      expect(editorsOwn).toHaveBeenCalledTimes(1);
    });

    it('reports where the caret went, as an offset', () => {
      const fake = createFakeMonacoEditor(TEXT);
      const handlers = events();
      createMonacoSelectionBridge(fake.editor, () => 0).listen?.(handlers);

      fake.moveCaretTo(13);

      expect(handlers.onCaretChange).toHaveBeenCalledWith(13);
    });

    it('reports when the editor loses focus', () => {
      const fake = createFakeMonacoEditor(TEXT);
      const handlers = events();
      createMonacoSelectionBridge(fake.editor, () => 0).listen?.(handlers);

      fake.blur();

      expect(handlers.onBlur).toHaveBeenCalledTimes(1);
    });

    it('stops listening to everything once unsubscribed', () => {
      const fake = createFakeMonacoEditor(TEXT);
      const handlers = events();
      const stop = createMonacoSelectionBridge(fake.editor, () => 0).listen?.(handlers);
      expect(fake.listenerCount()).toBe(3);

      stop?.();
      fake.pressKey('a');
      fake.moveCaretTo(2);
      fake.blur();

      expect(fake.listenerCount()).toBe(0);
      expect(handlers.onKeyDown).not.toHaveBeenCalled();
      expect(handlers.onCaretChange).not.toHaveBeenCalled();
      expect(handlers.onBlur).not.toHaveBeenCalled();
    });
  });

  describe('getCaretRect', () => {
    const rectOf = (offset: number, editorAt: { top: number; left: number }) => {
      const fake = createFakeMonacoEditor(TEXT);
      jest.spyOn(fake.domNode, 'getBoundingClientRect').mockReturnValue(editorAt as DOMRect);
      return {
        fake,
        rect: createMonacoSelectionBridge(fake.editor, () => 0).getCaretRect?.(offset),
      };
    };

    it('is where an offset is drawn, in viewport coordinates', () => {
      // Offset 13 is line 2, column 3 of TEXT: two characters in, one line down.
      const { rect } = rectOf(13, { top: 100, left: 50 });
      expect(rect).toEqual({ top: 100 + 18, left: 50 + 14, height: 18 });
    });

    it('moves with the editor, not with the page: the editor position is read each time', () => {
      expect(rectOf(0, { top: 10, left: 20 }).rect).toEqual({ top: 10, left: 20, height: 18 });
      expect(rectOf(0, { top: 300, left: 400 }).rect).toEqual({ top: 300, left: 400, height: 18 });
    });

    it('is undefined when the editor cannot say where the offset is, as outside its viewport', () => {
      const fake = createFakeMonacoEditor(TEXT);
      fake.getScrolledVisiblePosition.mockReturnValueOnce(null);
      expect(createMonacoSelectionBridge(fake.editor, () => 0).getCaretRect?.(3)).toBeUndefined();
    });

    it('is undefined when the editor has no model or no container', () => {
      const noModel = createFakeMonacoEditor(TEXT, { withModel: false });
      expect(
        createMonacoSelectionBridge(noModel.editor, () => 0).getCaretRect?.(3)
      ).toBeUndefined();
    });
  });
});
