/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { monaco } from '@kbn/code-editor';
import { loadTypeIconMasks } from '@kbn/workflows-ui';
import {
  getReferenceChipEditorCss,
  useReferenceDecorations,
  useReferenceIconMasks,
} from './use_reference_decorations';
import { findReferenceTokens } from '../lib/reference_tokens';
import { createFakeMonacoEditor } from '../test_utils/fake_monaco_editor';

jest.mock('@kbn/code-editor', () => ({
  monaco: { editor: { InjectedTextCursorStops: { None: 3 } } },
}));
jest.mock('@kbn/workflows-ui', () => ({ loadTypeIconMasks: jest.fn() }));

type Editor = monaco.editor.IStandaloneCodeEditor;

const draw = (editor: Editor | null, text: string) =>
  renderHook(
    (props: { editor: Editor | null; text: string }) =>
      useReferenceDecorations(props.editor, props.text, findReferenceTokens(props.text)),
    { initialProps: { editor, text } }
  );

describe('useReferenceDecorations', () => {
  it('draws one chip as an icon slot plus the opening delimiter, the expression and the closing delimiter', () => {
    const text = 'Hi {{ a }}';
    const fake = createFakeMonacoEditor(text);
    draw(fake.editor, text);

    expect(fake.collections).toHaveLength(1);
    const [icon, start, mid, end] = fake.collections[0].decorations;

    // The icon is injected text on an empty range at the start of the token.
    expect(icon.range).toEqual({
      startLineNumber: 1,
      startColumn: 4,
      endLineNumber: 1,
      endColumn: 4,
    });
    expect(icon.options).toEqual({
      showIfCollapsed: true,
      before: {
        content: '  ',
        inlineClassName:
          'workflowRefChipIcon workflowRefChipIcon--neutral workflowRefChipIcon--unknown',
        cursorStops: 3,
      },
    });

    // The three text parts are adjacent and cover the token exactly.
    expect(start.range).toEqual({
      startLineNumber: 1,
      startColumn: 4,
      endLineNumber: 1,
      endColumn: 6,
    });
    expect(mid.range).toEqual({
      startLineNumber: 1,
      startColumn: 6,
      endLineNumber: 1,
      endColumn: 9,
    });
    expect(end.range).toEqual({
      startLineNumber: 1,
      startColumn: 9,
      endLineNumber: 1,
      endColumn: 11,
    });
    expect(start.options.inlineClassName).toBe(
      'workflowRefChip workflowRefChip--start workflowRefChip--neutral'
    );
    expect(mid.options.inlineClassName).toBe(
      'workflowRefChip workflowRefChip--mid workflowRefChip--neutral'
    );
    expect(end.options.inlineClassName).toBe(
      'workflowRefChip workflowRefChip--end workflowRefChip--neutral'
    );
  });

  it('puts the hover on the expression only', () => {
    const text = '{{ a }}';
    const fake = createFakeMonacoEditor(text);
    draw(fake.editor, text);
    const [, start, mid, end] = fake.collections[0].decorations;
    expect(mid.options.hoverMessage).toEqual({ value: 'unknown · written as text' });
    expect(start.options.hoverMessage).toBeUndefined();
    expect(end.options.hoverMessage).toBeUndefined();
  });

  it('counts the three-character opening delimiter of the value form', () => {
    const text = '${{ a }}';
    const fake = createFakeMonacoEditor(text);
    draw(fake.editor, text);
    const [icon, start, mid] = fake.collections[0].decorations;
    expect(icon.range.startColumn).toBe(1);
    expect(start.range).toMatchObject({ startColumn: 1, endColumn: 4 });
    expect(mid.range).toMatchObject({ startColumn: 4, endColumn: 7 });
  });

  it('uses the warning tone for a value form inside a sentence', () => {
    const text = 'Hi ${{ a }}';
    const fake = createFakeMonacoEditor(text);
    draw(fake.editor, text);
    const classNames = fake.collections[0].decorations.map(
      ({ options }) => options.inlineClassName ?? options.before?.inlineClassName
    );
    expect(classNames.every((name) => name?.includes('--warning'))).toBe(true);
  });

  it('draws four decorations per token, on the right lines', () => {
    const text = '{{ a }}\n{{ b }}';
    const fake = createFakeMonacoEditor(text);
    draw(fake.editor, text);
    const { decorations } = fake.collections[0];
    expect(decorations).toHaveLength(8);
    expect(decorations[4].range).toMatchObject({ startLineNumber: 2, startColumn: 1 });
  });

  it('draws nothing for text without references', () => {
    const fake = createFakeMonacoEditor('plain');
    draw(fake.editor, 'plain');
    expect(fake.collections).toHaveLength(1);
    expect(fake.collections[0].decorations).toEqual([]);
  });

  it('waits until the editor model holds the same text', () => {
    const fake = createFakeMonacoEditor('stale');
    const { rerender } = draw(fake.editor, '{{ a }}');
    expect(fake.collections).toHaveLength(0);

    fake.setText('{{ a }}');
    rerender({ editor: fake.editor, text: '{{ a }}' });
    expect(fake.collections).toHaveLength(1);
  });

  it('draws nothing while there is no editor, then draws once it mounts', () => {
    const fake = createFakeMonacoEditor('{{ a }}');
    const { rerender } = draw(null, '{{ a }}');
    expect(fake.collections).toHaveLength(0);

    rerender({ editor: fake.editor, text: '{{ a }}' });
    expect(fake.collections).toHaveLength(1);
  });

  it('draws nothing when the editor has no model', () => {
    const fake = createFakeMonacoEditor('{{ a }}', { withModel: false });
    draw(fake.editor, '{{ a }}');
    expect(fake.collections).toHaveLength(0);
  });

  it('replaces the chips when the text changes', () => {
    const fake = createFakeMonacoEditor('{{ a }}');
    const { rerender } = draw(fake.editor, '{{ a }}');

    fake.setText('{{ a }} {{ b }}');
    rerender({ editor: fake.editor, text: '{{ a }} {{ b }}' });

    expect(fake.collections).toHaveLength(2);
    expect(fake.collections[0].isCleared()).toBe(true);
    expect(fake.collections[1].isCleared()).toBe(false);
    expect(fake.collections[1].decorations).toHaveLength(8);
  });

  it('clears the chips on unmount', () => {
    const fake = createFakeMonacoEditor('{{ a }}');
    const { unmount } = draw(fake.editor, '{{ a }}');
    unmount();
    expect(fake.collections[0].isCleared()).toBe(true);
  });
});

describe('useReferenceIconMasks', () => {
  const load = loadTypeIconMasks as jest.Mock;

  afterEach(() => load.mockReset());

  it('is empty until the icon chunks resolve, then holds the masks', async () => {
    load.mockResolvedValue({ string: 'data:string' });
    const { result } = renderHook(() => useReferenceIconMasks());
    expect(result.current).toEqual({});
    await waitFor(() => expect(result.current).toEqual({ string: 'data:string' }));
  });

  it('stays empty when nothing was loaded', async () => {
    load.mockResolvedValue({});
    const { result } = renderHook(() => useReferenceIconMasks());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toEqual({});
  });

  it('ignores masks that arrive after unmount', async () => {
    let resolve: (masks: Record<string, string>) => void = () => undefined;
    load.mockReturnValue(new Promise((done) => (resolve = done)));
    const { result, unmount } = renderHook(() => useReferenceIconMasks());
    unmount();
    await act(async () => {
      resolve({ string: 'data:string' });
      await Promise.resolve();
    });
    expect(result.current).toEqual({});
  });
});

describe('getReferenceChipEditorCss', () => {
  const buildCss = (masks: Record<string, string> = {}) => {
    const { result } = renderHook(() => useEuiTheme());
    return getReferenceChipEditorCss(result.current.euiTheme, masks, 'LIGHT');
  };

  it('styles both tones of the chip', () => {
    const css = buildCss();
    expect(css['.workflowRefChip--neutral']).toEqual({
      backgroundColor: expect.any(String),
      color: expect.any(String),
    });
    expect(css['.workflowRefChip--warning']).toEqual({
      backgroundColor: expect.any(String),
      color: expect.any(String),
    });
  });

  it('paints each type glyph from its mask', () => {
    const css = buildCss({ string: 'data:string', array: 'data:array' });
    expect(css['.workflowRefChipIcon--string::after']).toEqual({
      maskImage: 'url("data:string")',
      WebkitMaskImage: 'url("data:string")',
    });
    expect(css['.workflowRefChipIcon--array::after']).toBeDefined();
    expect(css['.workflowRefChipIcon--number::after']).toBeUndefined();
  });

  it('never changes the width of a character: edges are shadows, not padding or borders', () => {
    const css = buildCss();
    const widthAffecting = /^(padding|margin|width|border(Width|Inline|Block)?$)/;
    const offenders = Object.entries(css)
      .filter(([selector]) => selector.startsWith('.workflowRefChip--'))
      .flatMap(([selector, rules]) =>
        Object.keys(rules as object)
          .filter((property) => widthAffecting.test(property))
          .map((property) => `${selector} ${property}`)
      );
    expect(offenders).toEqual([]);
  });
});
