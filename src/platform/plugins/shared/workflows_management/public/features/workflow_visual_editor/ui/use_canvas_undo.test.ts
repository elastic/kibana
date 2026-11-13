/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import type { monaco } from '@kbn/code-editor';
import { useCanvasUndo } from './use_canvas_undo';

type Editor = monaco.editor.IStandaloneCodeEditor;

const makeEditor = (modelText: string | null) => {
  const trigger = jest.fn();
  const editor = {
    getModel: () => (modelText === null ? null : { getValue: () => modelText }),
    trigger,
  } as unknown as Editor;
  return { editor, trigger };
};

const press = (init: KeyboardEventInit, target: EventTarget = window) => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
};

const renderUndo = (editor: Editor | null, store: string, withRef = true) => {
  const editorRef: MutableRefObject<Editor | null> = { current: editor };
  const yamlStringRef: MutableRefObject<string> = { current: store };
  return renderHook(() => useCanvasUndo(withRef ? editorRef : undefined, yamlStringRef));
};

describe('useCanvasUndo', () => {
  it('delegates ⌘Z to the editor when it holds the same text as the store', () => {
    const { editor, trigger } = makeEditor('name: a\n');
    renderUndo(editor, 'name: a\n');

    const event = press({ key: 'z', metaKey: true });

    expect(event.defaultPrevented).toBe(true);
    expect(trigger).toHaveBeenCalledWith('graph-gesture', 'undo', null);
  });

  it('also reacts to Ctrl+Z', () => {
    const { editor, trigger } = makeEditor('name: a\n');
    renderUndo(editor, 'name: a\n');

    press({ key: 'z', ctrlKey: true });

    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it('swallows the key press without undoing while the editor trails the store', () => {
    const { editor, trigger } = makeEditor('name: old\n');
    renderUndo(editor, 'name: newer\n');

    const event = press({ key: 'z', metaKey: true });

    expect(event.defaultPrevented).toBe(true);
    expect(trigger).not.toHaveBeenCalled();
  });

  it('treats text that differs only by line endings as the same', () => {
    const { editor, trigger } = makeEditor('a: 1\r\nb: 2\r\n');
    renderUndo(editor, 'a: 1\nb: 2\n');

    press({ key: 'z', metaKey: true });

    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it('reads the store text at the time of the key press', () => {
    const { editor, trigger } = makeEditor('name: a\n');
    const editorRef: MutableRefObject<Editor | null> = { current: editor };
    const yamlStringRef: MutableRefObject<string> = { current: 'name: a\n' };
    renderHook(() => useCanvasUndo(editorRef, yamlStringRef));

    yamlStringRef.current = 'name: b\n';
    press({ key: 'z', metaKey: true });
    expect(trigger).not.toHaveBeenCalled();

    yamlStringRef.current = 'name: a\n';
    press({ key: 'z', metaKey: true });
    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it('still delegates when the editor has no model yet', () => {
    const { editor, trigger } = makeEditor(null);
    renderUndo(editor, 'name: a\n');

    press({ key: 'z', metaKey: true });

    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it('leaves ⌘Z to Monaco when focus is already inside the editor', () => {
    const { editor, trigger } = makeEditor('name: a\n');
    renderUndo(editor, 'name: a\n');
    const inside = document.createElement('div');
    inside.className = 'monaco-editor';
    const textarea = document.createElement('textarea');
    inside.appendChild(textarea);
    document.body.appendChild(inside);

    const event = press({ key: 'z', metaKey: true }, textarea);

    expect(event.defaultPrevented).toBe(false);
    expect(trigger).not.toHaveBeenCalled();
    inside.remove();
  });

  it.each([
    ['another key', { key: 'x', metaKey: true }],
    ['no modifier', { key: 'z' }],
  ])('ignores %s', (_label, init) => {
    const { editor, trigger } = makeEditor('name: a\n');
    renderUndo(editor, 'name: a\n');

    const event = press(init);

    expect(event.defaultPrevented).toBe(false);
    expect(trigger).not.toHaveBeenCalled();
  });

  it('does nothing without an editor ref, and stops listening on unmount', () => {
    const { editor, trigger } = makeEditor('name: a\n');
    renderUndo(editor, 'name: a\n', false);
    expect(press({ key: 'z', metaKey: true }).defaultPrevented).toBe(false);

    const { unmount } = renderUndo(editor, 'name: a\n');
    unmount();
    expect(press({ key: 'z', metaKey: true }).defaultPrevented).toBe(false);
    expect(trigger).not.toHaveBeenCalled();
  });

  it('swallows the key press when the editor ref is still empty, as before', () => {
    renderUndo(null, 'name: a\n');
    expect(press({ key: 'z', metaKey: true }).defaultPrevented).toBe(true);
  });

  describe('when focus is in a form control outside the editor', () => {
    const attach = (element: HTMLElement) => {
      document.body.appendChild(element);
      return element;
    };

    it.each([
      ['an input', () => document.createElement('input')],
      ['a textarea', () => document.createElement('textarea')],
      ['a select', () => document.createElement('select')],
      [
        'a contenteditable element',
        () => {
          const element = document.createElement('div');
          element.setAttribute('contenteditable', 'true');
          return element;
        },
      ],
    ])(
      'leaves ⌘Z to the browser in %s, so it undoes that control and not the workflow',
      (_l, make) => {
        const { editor, trigger } = makeEditor('name: a\n');
        renderUndo(editor, 'name: a\n');
        const control = attach(make());

        const event = press({ key: 'z', metaKey: true }, control);

        expect(event.defaultPrevented).toBe(false);
        expect(trigger).not.toHaveBeenCalled();
        control.remove();
      }
    );

    it('leaves ⌘Z to the browser inside a control nested in a form control wrapper', () => {
      const { editor, trigger } = makeEditor('name: a\n');
      renderUndo(editor, 'name: a\n');
      const wrapper = attach(document.createElement('div'));
      wrapper.setAttribute('contenteditable', 'true');
      const inner = document.createElement('span');
      wrapper.appendChild(inner);

      const event = press({ key: 'z', metaKey: true }, inner);

      expect(event.defaultPrevented).toBe(false);
      expect(trigger).not.toHaveBeenCalled();
      wrapper.remove();
    });

    it('still undoes the workflow when focus is on a plain element such as a button', () => {
      const { editor, trigger } = makeEditor('name: a\n');
      renderUndo(editor, 'name: a\n');
      const button = attach(document.createElement('button'));

      const event = press({ key: 'z', metaKey: true }, button);

      expect(event.defaultPrevented).toBe(true);
      expect(trigger).toHaveBeenCalledWith('graph-gesture', 'undo', null);
      button.remove();
    });
  });
});
