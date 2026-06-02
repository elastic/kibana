/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { usePreviewClone } from './use_preview_clone';

jest.mock('../../../../edit_engine/create_preview_clone', () => ({
  createPreviewClone: (target: HTMLElement) => {
    const clone = target.cloneNode(true) as HTMLElement;
    const elementMap = new Map<Element, Element>([[target, clone]]);
    return { clone, elementMap };
  },
}));

jest.mock('../../../../edit_engine/collect_text_nodes', () => ({
  collectAllTextNodes: (root: HTMLElement) => {
    const nodes: Text[] = [];
    const walk = (el: globalThis.Node) => {
      const children = Array.from(el.childNodes);
      children.forEach((child) => {
        if (child.nodeType === 3) nodes.push(child as Text);
        else walk(child);
      });
    };
    walk(root);
    return nodes;
  },
}));

jest.mock('../../../../edit_engine/collect_media_elements', () => ({
  collectMediaElements: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../../../edit_engine/managed_element', () => ({
  getContentRoot: (el: HTMLElement) => el,
}));

jest.mock('./use_element_selection', () => ({
  useElementSelection: () => ({
    selectedElement: null,
    color: '',
    setColor: jest.fn(),
    handleSelect: jest.fn(),
  }),
}));

describe('usePreviewClone', () => {
  const createTarget = () => {
    const target = document.createElement('div');
    target.textContent = 'hello world';
    document.body.appendChild(target);
    return target;
  };

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should initialize with null cloneRoot', () => {
    const target = createTarget();
    const { result } = renderHook(() => usePreviewClone(target));

    expect(result.current.cloneRoot).toBeNull();
    expect(result.current.cloneRef.current).toBeNull();
  });

  it('should create a clone when previewCallbackRef is called with a node', async () => {
    const target = createTarget();
    const { result } = renderHook(() => usePreviewClone(target));

    const container = document.createElement('div');
    document.body.appendChild(container);

    await act(async () => {
      result.current.previewCallbackRef(container);
    });

    expect(result.current.cloneRoot).not.toBeNull();
    expect(result.current.cloneRef.current).not.toBeNull();
    expect(container.children.length).toBe(1);
  });

  it('should remove old clone when previewCallbackRef is called again', async () => {
    const target = createTarget();
    const { result } = renderHook(() => usePreviewClone(target));

    const container = document.createElement('div');
    document.body.appendChild(container);

    await act(async () => result.current.previewCallbackRef(container));
    const firstClone = result.current.cloneRef.current;

    await act(async () => result.current.previewCallbackRef(container));

    expect(result.current.cloneRef.current).not.toBe(firstClone);
    expect(container.children.length).toBe(1);
  });

  it('should do nothing when previewCallbackRef is called with null', () => {
    const target = createTarget();
    const { result } = renderHook(() => usePreviewClone(target));

    act(() => result.current.previewCallbackRef(null));

    expect(result.current.cloneRoot).toBeNull();
  });

  it('should populate textEntries from target text nodes', async () => {
    const target = createTarget();
    const { result } = renderHook(() => usePreviewClone(target));

    const container = document.createElement('div');
    document.body.appendChild(container);

    await act(async () => result.current.previewCallbackRef(container));

    expect(result.current.textEntries.length).toBeGreaterThan(0);
    expect(result.current.textNodeMap.current.length).toBeGreaterThan(0);
  });

  it('should clear cloneRef on unmount', async () => {
    const target = createTarget();
    const { result, unmount } = renderHook(() => usePreviewClone(target));

    const container = document.createElement('div');
    document.body.appendChild(container);

    await act(async () => result.current.previewCallbackRef(container));
    expect(result.current.cloneRef.current).not.toBeNull();

    unmount();

    expect(result.current.cloneRef.current).toBeNull();
  });

  it('should expose setTextEntries and setMediaEntries for state updates', () => {
    const target = createTarget();
    const { result } = renderHook(() => usePreviewClone(target));

    expect(typeof result.current.setTextEntries).toBe('function');
    expect(typeof result.current.setMediaEntries).toBe('function');
  });
});
