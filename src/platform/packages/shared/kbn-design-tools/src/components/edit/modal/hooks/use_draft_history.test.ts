/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { useDraftHistory, flattenDraftEdits } from './use_draft_history';
import type {
  DraftStyleEdit,
  DraftTextEdit,
  DraftMediaEdit,
} from '../../../../lib/history/draft_history';
import type { DimensionRecord } from '../../../../edit_engine/clone_element';
import { setImportant } from '../../../../lib/dom/set_important';
import { EUI_CARD_ROOT_CLASS, EUI_CARD_IMAGE_CLASS } from '../../../../lib/constants';

describe('useDraftHistory', () => {
  const makeStyleEdit = (overrides: Partial<DraftStyleEdit> = {}): DraftStyleEdit => {
    const el = document.createElement('div');
    const cloneEl = document.createElement('div');
    return {
      type: 'style',
      label: 'Color',
      element: el,
      cloneElement: cloneEl,
      property: 'backgroundColor',
      before: '#ffffff',
      after: '#ff0000',
      ...overrides,
    };
  };

  const makeTextEdit = (overrides: Partial<DraftTextEdit> = {}): DraftTextEdit => {
    const node = document.createTextNode('hello');
    const cloneNode = document.createTextNode('hello');
    return {
      type: 'text',
      label: 'text',
      index: 0,
      originalNode: node,
      cloneNode,
      field: 'text',
      before: 'hello',
      after: 'world',
      ...overrides,
    };
  };

  const makeMediaEdit = (overrides: Partial<DraftMediaEdit> = {}): DraftMediaEdit => {
    const el = document.createElement('img');
    const cloneEl = document.createElement('img');
    cloneEl.setAttribute('src', 'old.png');
    return {
      type: 'media',
      label: 'Media',
      index: 0,
      originalElement: el,
      cloneElement: cloneEl,
      attribute: 'src',
      before: 'old.png',
      after: 'new.png',
      ...overrides,
    };
  };

  it('should start with empty state', () => {
    const { result } = renderHook(() => useDraftHistory());

    expect(result.current.state.canUndo).toBe(false);
    expect(result.current.state.canRedo).toBe(false);
  });

  it('should push a style edit and apply it to the clone', () => {
    const { result } = renderHook(() => useDraftHistory());
    const cloneEl = document.createElement('div');
    const edit = makeStyleEdit({ cloneElement: cloneEl });

    act(() => result.current.push(edit));

    expect(cloneEl.style.backgroundColor).toBe('rgb(255, 0, 0)');
    expect(result.current.state.canUndo).toBe(true);
    expect(result.current.state.canRedo).toBe(false);
  });

  it('should undo a style edit and return the edit', () => {
    const { result } = renderHook(() => useDraftHistory());
    const cloneEl = document.createElement('div');
    const edit = makeStyleEdit({ cloneElement: cloneEl, before: '', after: '#ff0000' });

    act(() => result.current.push(edit));
    expect(cloneEl.style.backgroundColor).toBe('rgb(255, 0, 0)');

    let undone: ReturnType<typeof result.current.undo>;
    act(() => {
      undone = result.current.undo();
    });

    expect(cloneEl.style.backgroundColor).toBe('');
    expect(undone!).toBe(edit);
    expect(result.current.state.canUndo).toBe(false);
    expect(result.current.state.canRedo).toBe(true);
  });

  it('should redo a style edit and return the edit', () => {
    const { result } = renderHook(() => useDraftHistory());
    const cloneEl = document.createElement('div');
    const edit = makeStyleEdit({ cloneElement: cloneEl, before: '', after: '#ff0000' });

    act(() => result.current.push(edit));
    act(() => result.current.undo());

    let redone: ReturnType<typeof result.current.redo>;
    act(() => {
      redone = result.current.redo();
    });

    expect(cloneEl.style.backgroundColor).toBe('rgb(255, 0, 0)');
    expect(redone!).toBe(edit);
    expect(result.current.state.canUndo).toBe(true);
    expect(result.current.state.canRedo).toBe(false);
  });

  it('should apply and reverse text edits', () => {
    const { result } = renderHook(() => useDraftHistory());
    const cloneNode = document.createTextNode('hello');
    const edit = makeTextEdit({ cloneNode, before: 'hello', after: 'world' });

    act(() => result.current.push(edit));
    expect(cloneNode.textContent).toBe('world');

    act(() => result.current.undo());
    expect(cloneNode.textContent).toBe('hello');

    act(() => result.current.redo());
    expect(cloneNode.textContent).toBe('world');
  });

  it('should apply and reverse text color edits', () => {
    const { result } = renderHook(() => useDraftHistory());
    const parent = document.createElement('span');
    const cloneNode = document.createTextNode('hello');
    parent.appendChild(cloneNode);
    const edit = makeTextEdit({
      cloneNode,
      field: 'color',
      before: '#000000',
      after: '#ff0000',
    });

    act(() => result.current.push(edit));
    expect(parent.style.getPropertyValue('color')).toBe('rgb(255, 0, 0)');

    act(() => result.current.undo());
    expect(parent.style.getPropertyValue('color')).toBe('rgb(0, 0, 0)');
  });

  it('should apply and reverse media edits', () => {
    const { result } = renderHook(() => useDraftHistory());
    const cloneEl = document.createElement('img');
    cloneEl.setAttribute('src', 'old.png');
    const edit = makeMediaEdit({ cloneElement: cloneEl });

    act(() => result.current.push(edit));
    expect(cloneEl.getAttribute('src')).toBe('new.png');

    act(() => result.current.undo());
    expect(cloneEl.getAttribute('src')).toBe('old.png');
  });

  it('should return null from undo/redo when stack is empty', () => {
    const { result } = renderHook(() => useDraftHistory());

    let undone: ReturnType<typeof result.current.undo>;
    act(() => {
      undone = result.current.undo();
    });
    expect(undone!).toBeNull();

    let redone: ReturnType<typeof result.current.redo>;
    act(() => {
      redone = result.current.redo();
    });
    expect(redone!).toBeNull();
  });

  it('should clear redo stack when a new edit is pushed', () => {
    const { result } = renderHook(() => useDraftHistory());
    const edit1 = makeStyleEdit({ after: '#ff0000' });
    const edit2 = makeStyleEdit({ after: '#00ff00' });

    act(() => result.current.push(edit1));
    act(() => result.current.undo());
    expect(result.current.state.canRedo).toBe(true);

    act(() => result.current.push(edit2));
    expect(result.current.state.canRedo).toBe(false);
  });

  it('should expose the edits map for flattenDraftEdits', () => {
    const { result } = renderHook(() => useDraftHistory());
    const edit = makeStyleEdit();

    act(() => result.current.push(edit));

    expect(result.current.edits.size).toBe(1);
  });

  it('should expose activeIds that exclude undone entries', () => {
    const { result } = renderHook(() => useDraftHistory());
    const edit1 = makeStyleEdit();
    const edit2 = makeStyleEdit({ property: 'color', before: 'red', after: 'blue' });

    act(() => result.current.push(edit1));
    act(() => result.current.push(edit2));
    expect(result.current.activeIds.size).toBe(2);

    act(() => result.current.undo());
    expect(result.current.activeIds.size).toBe(1);
    expect(result.current.edits.size).toBe(2);
  });

  describe('dimension tracking', () => {
    const makeDimensionRecords = (): { el: HTMLElement; records: DimensionRecord[] } => {
      const el = document.createElement('div');
      setImportant(el, 'width', '200px');
      setImportant(el, 'height', '100px');
      const records: DimensionRecord[] = [
        { element: el, property: 'width', value: '200px', priority: 'important' },
        { element: el, property: 'height', value: '100px', priority: 'important' },
      ];
      return { el, records };
    };

    it('should restore dimensions on undo after push with dimensions', () => {
      const { result } = renderHook(() => useDraftHistory());
      const cloneEl = document.createElement('div');
      const edit = makeStyleEdit({
        cloneElement: cloneEl,
        property: 'width',
        before: '100px',
        after: '400px',
      });
      const { el, records } = makeDimensionRecords();

      act(() => result.current.push(edit, records));

      // Simulate reflow removing dimensions (as the modal handler would do)
      el.style.removeProperty('width');
      el.style.removeProperty('height');
      expect(el.style.getPropertyValue('width')).toBe('');

      act(() => result.current.undo());

      expect(el.style.getPropertyValue('width')).toBe('200px');
      expect(el.style.getPropertyValue('height')).toBe('100px');
    });

    it('should remove dimensions on redo after undo', () => {
      const { result } = renderHook(() => useDraftHistory());
      const cloneEl = document.createElement('div');
      const edit = makeStyleEdit({
        cloneElement: cloneEl,
        property: 'width',
        before: '100px',
        after: '400px',
      });
      const { el, records } = makeDimensionRecords();

      act(() => result.current.push(edit, records));
      el.style.removeProperty('width');
      el.style.removeProperty('height');

      act(() => result.current.undo());
      expect(el.style.getPropertyValue('width')).toBe('200px');

      act(() => result.current.redo());
      expect(el.style.getPropertyValue('width')).toBe('');
      expect(el.style.getPropertyValue('height')).toBe('');
    });

    it('should re-run padding reflow on redo after undo', () => {
      const { result } = renderHook(() => useDraftHistory());
      const wrapper = document.createElement('div');
      const cloneEl = document.createElement('div');
      cloneEl.classList.add(EUI_CARD_ROOT_CLASS);
      cloneEl.style.padding = '16px';
      const imageWrapper = document.createElement('div');
      imageWrapper.classList.add(EUI_CARD_IMAGE_CLASS);
      wrapper.appendChild(cloneEl);
      cloneEl.appendChild(imageWrapper);

      const edit = makeStyleEdit({
        cloneElement: cloneEl,
        property: 'padding',
        before: '16px',
        after: '12px',
        reflowRoot: wrapper,
      });
      const records: DimensionRecord[] = [
        { element: imageWrapper, property: 'width', value: '', priority: '' },
      ];

      act(() => result.current.push(edit, records));
      imageWrapper.style.removeProperty('width');

      act(() => result.current.undo());
      expect(imageWrapper.style.getPropertyValue('width')).toBe('');

      act(() => result.current.redo());
      expect(imageWrapper.style.getPropertyValue('width')).toBe('calc(100% + 24px)');
    });

    it('should restore dimensions on undo after pushBatch with dimensions', () => {
      const { result } = renderHook(() => useDraftHistory());
      const cloneEl = document.createElement('div');
      const batch = [
        makeStyleEdit({
          cloneElement: cloneEl,
          property: 'width',
          before: '100px',
          after: '400px',
        }),
        makeStyleEdit({
          cloneElement: cloneEl,
          property: 'max-width',
          before: '100px',
          after: 'none',
        }),
      ];
      const { el, records } = makeDimensionRecords();

      act(() => result.current.pushBatch(batch, records));
      el.style.removeProperty('width');
      el.style.removeProperty('height');

      act(() => result.current.undo());

      expect(el.style.getPropertyValue('width')).toBe('200px');
      expect(el.style.getPropertyValue('height')).toBe('100px');
    });

    it('should not fail when no dimensions are provided', () => {
      const { result } = renderHook(() => useDraftHistory());
      const edit = makeStyleEdit();

      act(() => result.current.push(edit));
      act(() => result.current.undo());
      act(() => result.current.redo());

      expect(result.current.state.canUndo).toBe(true);
    });
  });
});

describe('flattenDraftEdits', () => {
  it('should deduplicate style edits by element+property, keeping first before', () => {
    const el = document.createElement('div');
    const cloneEl = document.createElement('div');
    const edits = new Map<number, DraftStyleEdit[]>([
      [
        1,
        [
          {
            type: 'style',
            label: 'Color',
            element: el,
            cloneElement: cloneEl,
            property: 'backgroundColor',
            before: '#ffffff',
            after: '#ff0000',
          },
        ],
      ],
      [
        2,
        [
          {
            type: 'style',
            label: 'Color',
            element: el,
            cloneElement: cloneEl,
            property: 'backgroundColor',
            before: '#ff0000',
            after: '#00ff00',
          },
        ],
      ],
    ]);

    const result = flattenDraftEdits(edits);

    expect(result.styleEdits).toHaveLength(1);
    expect(result.styleEdits[0].before).toBe('#ffffff');
    expect(result.styleEdits[0].after).toBe('#00ff00');
  });

  it('should filter out no-op edits where net effect is identity', () => {
    const el = document.createElement('div');
    const cloneEl = document.createElement('div');
    const edits = new Map<number, DraftStyleEdit[]>([
      [
        1,
        [
          {
            type: 'style',
            label: 'Color',
            element: el,
            cloneElement: cloneEl,
            property: 'backgroundColor',
            before: '#ffffff',
            after: '#ff0000',
          },
        ],
      ],
      [
        2,
        [
          {
            type: 'style',
            label: 'Color',
            element: el,
            cloneElement: cloneEl,
            property: 'backgroundColor',
            before: '#ff0000',
            after: '#ffffff',
          },
        ],
      ],
    ]);

    const result = flattenDraftEdits(edits);

    expect(result.styleEdits).toHaveLength(0);
  });

  it('should deduplicate text edits by index+field', () => {
    const node = document.createTextNode('hello');
    const cloneNode = document.createTextNode('hello');
    const edits = new Map<number, DraftTextEdit[]>([
      [
        1,
        [
          {
            type: 'text',
            label: 'text',
            index: 0,
            originalNode: node,
            cloneNode,
            field: 'text',
            before: 'hello',
            after: 'world',
          },
        ],
      ],
      [
        2,
        [
          {
            type: 'text',
            label: 'text',
            index: 0,
            originalNode: node,
            cloneNode,
            field: 'text',
            before: 'world',
            after: 'foo',
          },
        ],
      ],
    ]);

    const result = flattenDraftEdits(edits);

    expect(result.textEdits).toHaveLength(1);
    expect(result.textEdits[0].before).toBe('hello');
    expect(result.textEdits[0].after).toBe('foo');
  });

  it('should deduplicate media edits by index', () => {
    const el = document.createElement('img');
    const cloneEl = document.createElement('img');
    const edits = new Map<number, DraftMediaEdit[]>([
      [
        1,
        [
          {
            type: 'media',
            label: 'Media',
            index: 0,
            originalElement: el,
            cloneElement: cloneEl,
            attribute: 'src',
            before: 'a.png',
            after: 'b.png',
          },
        ],
      ],
      [
        2,
        [
          {
            type: 'media',
            label: 'Media',
            index: 0,
            originalElement: el,
            cloneElement: cloneEl,
            attribute: 'src',
            before: 'b.png',
            after: 'c.png',
          },
        ],
      ],
    ]);

    const result = flattenDraftEdits(edits);

    expect(result.mediaEdits).toHaveLength(1);
    expect(result.mediaEdits[0].before).toBe('a.png');
    expect(result.mediaEdits[0].after).toBe('c.png');
  });

  it('should exclude undone edits when activeIds is provided', () => {
    const el = document.createElement('div');
    const cloneEl = document.createElement('div');
    const edits = new Map<number, DraftStyleEdit[]>([
      [
        1,
        [
          {
            type: 'style',
            label: 'Color',
            element: el,
            cloneElement: cloneEl,
            property: 'backgroundColor',
            before: '#ffffff',
            after: '#ff0000',
          },
        ],
      ],
      [
        2,
        [
          {
            type: 'style',
            label: 'Color',
            element: el,
            cloneElement: cloneEl,
            property: 'backgroundColor',
            before: '#ff0000',
            after: '#00ff00',
          },
        ],
      ],
    ]);

    // Only transaction 1 is active (transaction 2 was undone)
    const activeIds = new Set([1]);
    const result = flattenDraftEdits(edits, activeIds);

    expect(result.styleEdits).toHaveLength(1);
    expect(result.styleEdits[0].after).toBe('#ff0000');
  });
});
