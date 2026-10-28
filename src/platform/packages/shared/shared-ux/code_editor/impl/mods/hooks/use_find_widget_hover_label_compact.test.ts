/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { monaco } from '@kbn/monaco';
import { useFindWidgetHoverLabelCompact } from './use_find_widget_hover_label_compact';

const createHarness = () => {
  const container = document.createElement('div');
  const closeButton = document.createElement('button');
  let onStateChange: ((event: { isRevealed?: boolean }) => void) | undefined;
  const dispose = jest.fn();
  const state = {
    isRevealed: false,
    onFindReplaceStateChange: (listener: typeof onStateChange) => {
      onStateChange = listener;
      return { dispose };
    },
  };
  const stack: Array<{
    options: { target: HTMLElement };
    hover: { domNode: HTMLElement };
  }> = [];
  const controller = {
    _widget: { _closeBtn: { domNode: closeButton } },
    _hoverService: { _hoverStack: stack },
    getState: () => state,
  };
  const editor = {
    getContribution: (id: string) => (id === 'editor.contrib.findController' ? controller : null),
    getContainerDomNode: () => container,
  } as unknown as monaco.editor.IStandaloneCodeEditor;

  return {
    editor,
    dispose,
    setVisible: (visible: boolean) => {
      state.isRevealed = visible;
      onStateChange?.({ isRevealed: true });
    },
    showTooltip: (isCloseButton = true) => {
      const tooltip = document.createElement('div');
      const label = document.createElement('div');
      label.className = 'hover-contents';
      label.style.whiteSpace = 'pre-wrap';
      label.textContent = 'Close (Escape)';
      tooltip.appendChild(label);
      stack.splice(0, stack.length, {
        options: { target: isCloseButton ? closeButton : document.createElement('button') },
        hover: { domNode: tooltip },
      });
      container.replaceChildren(tooltip);
      return label;
    },
  };
};

describe('useFindWidgetHoverLabelCompact', () => {
  it('updates an existing tooltip when mounted with Find already open', () => {
    const harness = createHarness();
    harness.setVisible(true);
    const label = harness.showTooltip();
    const { unmount } = renderHook(() => useFindWidgetHoverLabelCompact(harness.editor));

    expect(label.style.whiteSpace).toBe('nowrap');
    unmount();
  });

  it('updates each close tooltip while preserving unrelated tooltips', async () => {
    const harness = createHarness();
    const { unmount } = renderHook(() => useFindWidgetHoverLabelCompact(harness.editor));
    harness.setVisible(true);

    const firstLabel = harness.showTooltip();
    await waitFor(() => expect(firstLabel.style.whiteSpace).toBe('nowrap'));

    const unrelatedLabel = harness.showTooltip(false);
    await Promise.resolve();
    expect(unrelatedLabel.style.whiteSpace).toBe('pre-wrap');
    const secondLabel = harness.showTooltip();
    await waitFor(() => expect(secondLabel.style.whiteSpace).toBe('nowrap'));
    expect(unrelatedLabel.style.whiteSpace).toBe('pre-wrap');
    unmount();
  });

  it('disconnects on close and unmount and reconnects when Find reopens', async () => {
    const harness = createHarness();
    const { unmount } = renderHook(() => useFindWidgetHoverLabelCompact(harness.editor));
    harness.setVisible(true);
    const label = harness.showTooltip();
    await waitFor(() => expect(label.style.whiteSpace).toBe('nowrap'));

    harness.setVisible(false);
    const closedLabel = harness.showTooltip();
    await Promise.resolve();
    expect(closedLabel.style.whiteSpace).toBe('pre-wrap');

    harness.setVisible(true);
    expect(closedLabel.style.whiteSpace).toBe('nowrap');
    unmount();
    expect(harness.dispose).toHaveBeenCalledTimes(1);

    const unmountedLabel = harness.showTooltip();
    await Promise.resolve();
    expect(unmountedLabel.style.whiteSpace).toBe('pre-wrap');
  });

  it('handles an editor without a find contribution', () => {
    const editor = {
      getContribution: () => null,
      getContainerDomNode: () => document.createElement('div'),
    } as unknown as monaco.editor.IStandaloneCodeEditor;
    const { unmount } = renderHook(() => useFindWidgetHoverLabelCompact(editor));
    unmount();
  });
});
