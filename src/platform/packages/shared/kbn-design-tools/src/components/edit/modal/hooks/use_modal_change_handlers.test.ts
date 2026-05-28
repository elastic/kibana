/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { useModalChangeHandlers } from './use_modal_change_handlers';
import { useDraftHistory } from './use_draft_history';
import type { TextNodeEntry } from '../text_node_editor';
import type { MediaEditorEntry } from '../media_editor';
import type { DraftHistoryResult } from './use_draft_history';
import {
  collectStyleReflowDimensions,
  collectTextReflowDimensions,
  reflowAfterStyleChange,
  reflowAfterTextChange,
} from '../../../../edit_engine/clone_element';

jest.mock('../../../../edit_engine/clone_element', () => ({
  reflowAfterStyleChange: jest.fn(),
  reflowAfterTextChange: jest.fn(),
  collectTextReflowDimensions: jest.fn(() => []),
  collectStyleReflowDimensions: jest.fn(() => []),
  setImportant: (el: HTMLElement, prop: string, value: string) => {
    el.style.setProperty(prop, value, 'important');
  },
  restoreDimensions: jest.fn(),
}));

const createArgs = (overrides: Partial<Parameters<typeof useModalChangeHandlers>[0]> = {}) => {
  const el = document.createElement('div');
  const cloneEl = document.createElement('div');
  cloneEl.style.backgroundColor = 'rgb(255, 255, 255)';
  cloneEl.style.width = '100px';
  cloneEl.style.height = '50px';
  cloneEl.style.padding = '10px';
  cloneEl.style.margin = '0px';
  cloneEl.style.borderRadius = '4px';
  cloneEl.style.overflow = 'visible';

  const elementMap = new Map<Element, Element>([[el, cloneEl]]);
  const textNode = document.createTextNode('hello');
  const cloneTextNode = document.createTextNode('hello');
  const textParent = document.createElement('span');
  textParent.appendChild(cloneTextNode);
  textParent.style.color = 'rgb(0, 0, 0)';
  textParent.style.fontSize = '14px';
  textParent.style.fontWeight = '400';

  const imgEl = document.createElement('img');
  imgEl.setAttribute('src', 'old.png');
  const cloneImg = document.createElement('img');
  cloneImg.setAttribute('src', 'old.png');

  const textEntries: TextNodeEntry[] = [
    {
      node: textNode,
      text: 'hello',
      color: '#000000',
      fontSize: '14px',
      fontWeight: '400',
      originalText: 'hello',
      originalColor: '#000000',
      originalFontSize: '14px',
      originalFontWeight: '400',
    },
  ];

  const mediaEntries: MediaEditorEntry[] = [
    {
      element: imgEl,
      attribute: 'src',
      value: 'old.png',
      originalValue: 'old.png',
      label: 'img',
    },
  ];

  return {
    selectedElement: el as Element | null,
    color: '#ffffff',
    setColor: jest.fn(),
    handleSelect: jest.fn(),
    draft: null as unknown as DraftHistoryResult,
    elementMapRef: { current: elementMap },
    textNodeMap: { current: [{ original: textNode, clone: cloneTextNode }] },
    mediaMap: { current: [{ original: imgEl, clone: cloneImg, attribute: 'src' }] },
    cloneRef: { current: cloneEl },
    textEntries,
    setTextEntries: jest.fn(),
    mediaEntries,
    setMediaEntries: jest.fn(),
    dimensionProps: [
      { property: 'width', label: 'Width' },
      { property: 'height', label: 'Height' },
      { property: 'padding', label: 'Padding' },
      { property: 'margin', label: 'Margin' },
      { property: 'border-radius', label: 'Border radius' },
    ],
    onSave: jest.fn(),
    ...overrides,
  };
};

describe('useModalChangeHandlers', () => {
  describe('handleColorChange', () => {
    it('should push a style edit to the draft', () => {
      const { result: draftResult } = renderHook(() => useDraftHistory());
      const args = createArgs();

      const { result } = renderHook(() =>
        useModalChangeHandlers({ ...args, draft: draftResult.current })
      );

      act(() => result.current.handleColorChange('#ff0000'));

      expect(draftResult.current.state.canUndo).toBe(true);
      expect(args.setColor).toHaveBeenCalledWith('#ff0000');
    });

    it('should do nothing when color is unchanged', () => {
      const { result: draftResult } = renderHook(() => useDraftHistory());
      const args = createArgs({ color: '#aabbcc' });

      const { result } = renderHook(() =>
        useModalChangeHandlers({ ...args, draft: draftResult.current })
      );

      act(() => result.current.handleColorChange('#aabbcc'));

      expect(draftResult.current.state.canUndo).toBe(false);
      expect(args.setColor).not.toHaveBeenCalled();
    });

    it('should do nothing when no element is selected', () => {
      const { result: draftResult } = renderHook(() => useDraftHistory());
      const args = createArgs({ selectedElement: null });

      const { result } = renderHook(() =>
        useModalChangeHandlers({ ...args, draft: draftResult.current })
      );

      act(() => result.current.handleColorChange('#ff0000'));

      expect(draftResult.current.state.canUndo).toBe(false);
    });
  });

  describe('handleDimensionChange', () => {
    it('should push a dimension edit to the draft', () => {
      const { result: draftResult } = renderHook(() => useDraftHistory());
      const args = createArgs();

      const { result } = renderHook(() =>
        useModalChangeHandlers({ ...args, draft: draftResult.current })
      );

      act(() => result.current.handleDimensionChange('padding', '20px'));

      expect(draftResult.current.state.canUndo).toBe(true);
    });

    it('should do nothing when value is unchanged', () => {
      const { result: draftResult } = renderHook(() => useDraftHistory());
      const args = createArgs();

      const { result } = renderHook(() =>
        useModalChangeHandlers({ ...args, draft: draftResult.current })
      );

      act(() => result.current.handleDimensionChange('padding', '10px'));

      expect(draftResult.current.state.canUndo).toBe(false);
    });

    it('should not synthesize width and height edits when padding changes on border-box element', () => {
      const { result: draftResult } = renderHook(() => useDraftHistory());
      const args = createArgs();
      const cloneEl = args.elementMapRef.current.get(args.selectedElement!)! as HTMLElement;
      cloneEl.style.boxSizing = 'border-box';

      const { result } = renderHook(() =>
        useModalChangeHandlers({ ...args, draft: draftResult.current })
      );

      act(() => result.current.handleDimensionChange('padding', '20px'));

      const allEdits = Array.from(draftResult.current.edits.values()).flat();
      const styleEdits = allEdits.filter((e) => e.type === 'style');
      const paddingEdit = styleEdits.find((e) => e.property === 'padding');
      const widthEdit = styleEdits.find((e) => e.property === 'width');
      const heightEdit = styleEdits.find((e) => e.property === 'height');

      expect(paddingEdit).toBeDefined();
      expect(widthEdit).toBeUndefined();
      expect(heightEdit).toBeUndefined();
    });

    it('should not compensate width/height when padding changes on content-box element', () => {
      const { result: draftResult } = renderHook(() => useDraftHistory());
      const args = createArgs();
      const cloneEl = args.elementMapRef.current.get(args.selectedElement!)! as HTMLElement;
      cloneEl.style.boxSizing = 'content-box';

      const { result } = renderHook(() =>
        useModalChangeHandlers({ ...args, draft: draftResult.current })
      );

      act(() => result.current.handleDimensionChange('padding', '20px'));

      const allEdits = Array.from(draftResult.current.edits.values()).flat();
      const styleEdits = allEdits.filter((e) => e.type === 'style');
      const widthEdit = styleEdits.find((e) => e.property === 'width');
      const heightEdit = styleEdits.find((e) => e.property === 'height');

      expect(widthEdit).toBeUndefined();
      expect(heightEdit).toBeUndefined();
    });

    it('should use preview wrapper as style reflow root boundary', () => {
      jest.clearAllMocks();
      const { result: draftResult } = renderHook(() => useDraftHistory());
      const args = createArgs();
      const selected = args.selectedElement as HTMLElement;
      const cloneEl = args.elementMapRef.current.get(selected) as HTMLElement;
      const wrapper = document.createElement('div');
      wrapper.appendChild(cloneEl);
      args.cloneRef.current = wrapper;

      const { result } = renderHook(() =>
        useModalChangeHandlers({ ...args, draft: draftResult.current })
      );

      act(() => result.current.handleDimensionChange('padding', '20px'));

      expect(collectStyleReflowDimensions).toHaveBeenCalledWith(cloneEl, 'padding', wrapper);
      expect(reflowAfterStyleChange).toHaveBeenCalledWith(cloneEl, 'padding', wrapper);
    });
  });

  describe('handleMediaChange', () => {
    it('should push a media edit reading the current value from the DOM', () => {
      const { result: draftResult } = renderHook(() => useDraftHistory());
      const args = createArgs();

      const { result } = renderHook(() =>
        useModalChangeHandlers({ ...args, draft: draftResult.current })
      );

      act(() => result.current.handleMediaChange(0, 'new.png'));

      expect(draftResult.current.state.canUndo).toBe(true);
      expect(args.setMediaEntries).toHaveBeenCalled();
    });

    it('should do nothing when value matches the clone attribute', () => {
      const { result: draftResult } = renderHook(() => useDraftHistory());
      const args = createArgs();

      const { result } = renderHook(() =>
        useModalChangeHandlers({ ...args, draft: draftResult.current })
      );

      act(() => result.current.handleMediaChange(0, 'old.png'));

      expect(draftResult.current.state.canUndo).toBe(false);
    });

    it('should do nothing for invalid index', () => {
      const { result: draftResult } = renderHook(() => useDraftHistory());
      const args = createArgs();

      const { result } = renderHook(() =>
        useModalChangeHandlers({ ...args, draft: draftResult.current })
      );

      act(() => result.current.handleMediaChange(99, 'new.png'));

      expect(draftResult.current.state.canUndo).toBe(false);
    });
  });

  describe('handleTextNodeChange', () => {
    it('should push a text edit to the draft', () => {
      const { result: draftResult } = renderHook(() => useDraftHistory());
      const args = createArgs();

      const { result } = renderHook(() =>
        useModalChangeHandlers({ ...args, draft: draftResult.current })
      );

      act(() => result.current.handleTextNodeChange(0, { text: 'world' }));

      expect(draftResult.current.state.canUndo).toBe(true);
      expect(args.setTextEntries).toHaveBeenCalled();
    });

    it('should do nothing for invalid index', () => {
      const { result: draftResult } = renderHook(() => useDraftHistory());
      const args = createArgs();

      const { result } = renderHook(() =>
        useModalChangeHandlers({ ...args, draft: draftResult.current })
      );

      act(() => result.current.handleTextNodeChange(99, { text: 'world' }));

      expect(draftResult.current.state.canUndo).toBe(false);
    });

    it('should use inner clone root as text reflow root boundary', () => {
      jest.clearAllMocks();
      const { result: draftResult } = renderHook(() => useDraftHistory());
      const args = createArgs();
      const wrapper = document.createElement('div');
      const selected = args.selectedElement as HTMLElement;
      const cloneEl = args.elementMapRef.current.get(selected) as HTMLElement;
      wrapper.appendChild(cloneEl);
      args.cloneRef.current = wrapper;

      const cloneTextNode = args.textNodeMap.current[0].clone;
      const textParent = cloneTextNode.parentElement as HTMLElement;

      const { result } = renderHook(() =>
        useModalChangeHandlers({ ...args, draft: draftResult.current })
      );

      act(() => result.current.handleTextNodeChange(0, { text: 'world' }));

      expect(collectTextReflowDimensions).toHaveBeenCalledWith(textParent, cloneEl);
      expect(reflowAfterTextChange).toHaveBeenCalledWith(textParent, cloneEl);
    });
  });

  describe('handleDraftUndo / handleDraftRedo', () => {
    it('should sync UI state after undo', () => {
      const { result: draftResult } = renderHook(() => useDraftHistory());
      const args = createArgs();

      const { result } = renderHook(() =>
        useModalChangeHandlers({ ...args, draft: draftResult.current })
      );

      act(() => result.current.handleColorChange('#ff0000'));
      act(() => result.current.handleDraftUndo());

      expect(args.setColor).toHaveBeenLastCalledWith('#ffffff');
    });

    it('should sync UI state after redo', () => {
      const { result: draftResult } = renderHook(() => useDraftHistory());
      const args = createArgs();

      const { result } = renderHook(() =>
        useModalChangeHandlers({ ...args, draft: draftResult.current })
      );

      act(() => result.current.handleColorChange('#ff0000'));
      act(() => result.current.handleDraftUndo());
      act(() => result.current.handleDraftRedo());

      expect(args.setColor).toHaveBeenLastCalledWith('#ff0000');
    });
  });

  describe('handleSave', () => {
    it('should flatten edits and call onSave with net changes', () => {
      const { result: draftResult } = renderHook(() => useDraftHistory());
      const args = createArgs();

      const { result } = renderHook(() =>
        useModalChangeHandlers({ ...args, draft: draftResult.current })
      );

      act(() => result.current.handleColorChange('#ff0000'));
      act(() => result.current.handleSave());

      expect(args.onSave).toHaveBeenCalledTimes(1);
      const [styleChanges, textChanges, mediaChanges] = (args.onSave as jest.Mock).mock.calls[0];
      expect(styleChanges).toHaveLength(1);
      expect(styleChanges[0].property).toBe('backgroundColor');
      expect(styleChanges[0].value).toBe('#ff0000');
      expect(textChanges).toHaveLength(0);
      expect(mediaChanges).toHaveLength(0);
    });

    it('should not include undone edits when saving', () => {
      const { result: draftResult } = renderHook(() => useDraftHistory());
      const args = createArgs();

      const { result } = renderHook(() =>
        useModalChangeHandlers({ ...args, draft: draftResult.current })
      );

      act(() => result.current.handleColorChange('#ff0000'));
      act(() => result.current.handleDraftUndo());
      act(() => result.current.handleSave());

      expect(args.onSave).toHaveBeenCalledTimes(1);
      const [styleChanges] = (args.onSave as jest.Mock).mock.calls[0];
      expect(styleChanges).toHaveLength(0);
    });
  });

  describe('originalDimensionsRef', () => {
    it('should capture original dimensions on first selection', () => {
      const { result: draftResult } = renderHook(() => useDraftHistory());
      const args = createArgs();
      // The hook reads getComputedStyle(selectedElement) which in jsdom
      // returns the inline style values. Set them on the selected element.
      const el = args.selectedElement as HTMLElement;
      el.style.width = '100px';
      el.style.height = '50px';
      el.style.padding = '10px';
      el.style.margin = '0px';
      el.style.borderRadius = '4px';
      el.style.overflow = 'visible';

      const { result } = renderHook(() =>
        useModalChangeHandlers({ ...args, draft: draftResult.current })
      );

      const origDims = result.current.originalDimensionsRef.current;
      expect(origDims.has(el)).toBe(true);
      const dims = origDims.get(el)!;
      expect(dims.get('width')).toBe('100px');
      expect(dims.get('overflow')).toBe('visible');
    });
  });
});
