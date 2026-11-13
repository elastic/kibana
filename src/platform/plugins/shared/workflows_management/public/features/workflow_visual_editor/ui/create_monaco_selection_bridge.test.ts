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
});
