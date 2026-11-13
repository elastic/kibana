/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import { caretAfterChange, useReferenceEditor } from './use_reference_editor';
import type { DataReferenceCatalog } from '../lib/build_data_reference_catalog';
import { createFakeMonacoEditor } from '../test_utils/fake_monaco_editor';

jest.mock('@kbn/code-editor', () =>
  jest.requireActual('../test_utils/mock_code_editor').createCodeEditorModuleMock()
);
jest.mock('@kbn/workflows-ui', () =>
  jest.requireActual('../test_utils/mock_workflows_ui').createWorkflowsUiModuleMock()
);

const catalog: DataReferenceCatalog = {
  groups: [
    {
      id: 'context',
      title: 'Workflow context',
      description: '',
      items: [
        {
          path: 'consts.tags',
          label: 'tags',
          typeLabel: 'string[]',
          drillable: false,
          originLabel: 'Workflow context',
        },
        {
          path: 'consts.name',
          label: 'name',
          typeLabel: 'string',
          drillable: false,
          originLabel: 'Workflow context',
        },
      ],
    },
  ],
};

const SENTENCE = 'Tags: {{ consts.tags }} and {{ consts.name }}';

const renderEditor = (
  options: Partial<Parameters<typeof useReferenceEditor>[0]> & { text?: string } = {}
) =>
  renderHook((props: Parameters<typeof useReferenceEditor>[0]) => useReferenceEditor(props), {
    initialProps: {
      text: SENTENCE,
      catalog,
      warnContainersInSentence: true,
      ...options,
    },
  });

describe('useReferenceEditor', () => {
  describe('tokens', () => {
    it('finds the references in the text, typed from the catalog', () => {
      const { result } = renderEditor();
      expect(result.current.tokens.map((token) => [token.expression, token.typeLabel])).toEqual([
        ['consts.tags', 'string[]'],
        ['consts.name', 'string'],
      ]);
    });

    it('reads a quoted reference as the whole value only for JSON', () => {
      const text = '{"a": "${{ consts.name }}"}';
      expect(
        renderEditor({ text, quotedStringsAreValues: true }).result.current.tokens[0].isWhole
      ).toBe(true);
      expect(renderEditor({ text }).result.current.tokens[0].isWhole).toBe(false);
    });

    it('finds the references again when the text changes', () => {
      const { result, rerender } = renderEditor({ text: 'none' });
      expect(result.current.tokens).toEqual([]);
      rerender({ text: '{{ consts.name }}', catalog, warnContainersInSentence: true });
      expect(result.current.tokens).toHaveLength(1);
    });
  });

  describe('the list-inside-a-sentence warning', () => {
    it('points at a list placed in a sentence', () => {
      expect(renderEditor().result.current.warning?.expression).toBe('consts.tags');
    });

    it('is off when the field does not ask for it', () => {
      expect(
        renderEditor({ warnContainersInSentence: false }).result.current.warning
      ).toBeUndefined();
    });

    it('does not flag a list that is the whole value', () => {
      expect(renderEditor({ text: '{{ consts.tags }}' }).result.current.warning).toBeUndefined();
    });

    it('goes away when dismissed, and stays away while that reference is in the text', () => {
      const { result, rerender } = renderEditor();
      act(() => result.current.dismissWarning());
      expect(result.current.warning).toBeUndefined();

      rerender({ text: `${SENTENCE}!`, catalog, warnContainersInSentence: true });
      expect(result.current.warning).toBeUndefined();
    });

    it('has nothing left to warn about once the one list is dismissed', () => {
      const text = 'A {{ consts.tags }} B {{ consts.tags | join: "," }}';
      const { result } = renderEditor({ text });
      expect(result.current.warning?.expression).toBe('consts.tags');
      act(() => result.current.dismissWarning());
      // The filtered one is a string, not a list, so there is nothing left to warn about.
      expect(result.current.warning).toBeUndefined();
    });

    it('does nothing when there is nothing to dismiss', () => {
      const { result } = renderEditor({ text: 'plain' });
      expect(() => act(() => result.current.dismissWarning())).not.toThrow();
      expect(result.current.warning).toBeUndefined();
    });
  });

  describe('the editor', () => {
    it('is not there until one mounts', () => {
      expect(renderEditor().result.current.editor).toBeNull();
    });

    it('is the one that mounted', () => {
      const fake = createFakeMonacoEditor(SENTENCE);
      const { result } = renderEditor();
      act(() => result.current.captureEditor(fake.editor));
      expect(result.current.editor).toBe(fake.editor);
    });

    it('keeps the first editor until it is released, as the editor can report a mount more than once', () => {
      const first = createFakeMonacoEditor(SENTENCE);
      const second = createFakeMonacoEditor(SENTENCE);
      const { result } = renderEditor();
      act(() => result.current.captureEditor(first.editor));
      act(() => result.current.captureEditor(second.editor));
      expect(result.current.editor).toBe(first.editor);

      act(() => result.current.releaseEditor());
      expect(result.current.editor).toBeNull();
      act(() => result.current.captureEditor(second.editor));
      expect(result.current.editor).toBe(second.editor);
    });

    it('draws the references on the editor that mounted, not before', () => {
      const fake = createFakeMonacoEditor(SENTENCE);
      const { result } = renderEditor();
      expect(fake.collections).toHaveLength(0);

      act(() => result.current.captureEditor(fake.editor));

      expect(fake.collections).toHaveLength(1);
      // Two references, four decorations each: the icon slot and the three parts of the chip.
      expect(fake.collections[0].decorations).toHaveLength(8);
    });
  });
});

describe('useReferenceEditor chip styles', () => {
  it('styles the chips it draws, for the container of the editor', () => {
    const { result } = renderEditor();
    expect(result.current.chipCss['.workflowRefChip--neutral']).toBeDefined();
    expect(result.current.chipCss['.workflowRefChip--warning']).toBeDefined();
  });

  it('hands out the same styles while nothing they depend on changes', () => {
    const { result, rerender } = renderEditor();
    const first = result.current.chipCss;
    expect(first).toBeDefined();
    rerender({ text: `${SENTENCE}!`, catalog, warnContainersInSentence: true });
    expect(result.current.chipCss).toBe(first);
  });
});

describe('caretAfterChange', () => {
  it('is where the last change ended', () => {
    expect(caretAfterChange('hello world', { changes: [{ rangeOffset: 6, text: 'wor' }] })).toBe(9);
  });

  it('uses the last of several changes', () => {
    expect(
      caretAfterChange('abcdef', {
        changes: [
          { rangeOffset: 0, text: 'a' },
          { rangeOffset: 4, text: 'ef' },
        ],
      })
    ).toBe(6);
  });

  it('is the end of the text when the change is unknown', () => {
    expect(caretAfterChange('hello', undefined)).toBe(5);
    expect(caretAfterChange('hello', { changes: [] })).toBe(5);
  });

  it('never goes past the end of the text', () => {
    expect(caretAfterChange('abc', { changes: [{ rangeOffset: 2, text: 'xxxxxx' }] })).toBe(3);
  });
});
