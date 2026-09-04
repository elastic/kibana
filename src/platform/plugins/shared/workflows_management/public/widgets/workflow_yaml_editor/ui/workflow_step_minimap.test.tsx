/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { createRef } from 'react';
import { WorkflowStepMinimap } from './workflow_step_minimap';
import { setYamlString } from '../../../entities/workflows/store';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';
import { getTestProvider } from '../../../shared/mocks/test_providers';
import { createMockMonacoEditor } from '../../../shared/test_utils/mock_monaco';

// ── YAML fixtures ─────────────────────────────────────────────────────────────
// Two separate steps so there is always a visible range to show/hide the indicator.
const TWO_STEP_YAML = `\
steps:
  - name: step-a
    type: slack.sendMessage
  - name: step-b
    type: slack.sendMessage
`;

const BROKEN_YAML = ': : invalid yaml : : :';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Renders the minimap with a store pre-seeded with the given YAML. */
const renderMinimap = (
  yaml: string,
  editorOverrides?: Partial<ReturnType<typeof createMockMonacoEditor>['editor']>
) => {
  const store = createMockStore();

  // The middleware computes workflowLookup synchronously on first dispatch (computed === undefined).
  store.dispatch(setYamlString(yaml));

  const { editor: editorInstance } = createMockMonacoEditor(yaml, editorOverrides as any);
  const scrollContainerRef = createRef<HTMLDivElement | null>();

  // Wrap in a div so scrollContainerRef is satisfied.
  const { rerender, unmount } = render(
    <div
      ref={(el) => {
        (scrollContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }}
    >
      <WorkflowStepMinimap
        editor={editorInstance}
        validationErrors={[]}
        scrollContainerRef={scrollContainerRef as React.RefObject<HTMLDivElement | null>}
      />
    </div>,
    { wrapper: getTestProvider({ store }) }
  );

  return { store, editor: editorInstance, scrollContainerRef, rerender, unmount };
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('WorkflowStepMinimap', () => {
  it('attaches scroll/layout listeners when the editor is provided at mount', () => {
    const { editor } = renderMinimap(TWO_STEP_YAML);

    // All three listener types should be registered exactly once on mount.
    expect(editor.onDidScrollChange).toHaveBeenCalledTimes(1);
    expect(editor.onDidLayoutChange).toHaveBeenCalledTimes(1);
    expect(editor.onDidChangeCursorPosition).toHaveBeenCalledTimes(1);
  });

  it('renders pill buttons for each step when the YAML is valid', async () => {
    renderMinimap(TWO_STEP_YAML);

    // Both step IDs should appear as pill titles.
    await waitFor(() => {
      expect(screen.getByTitle('step-a')).toBeInTheDocument();
      expect(screen.getByTitle('step-b')).toBeInTheDocument();
    });
  });

  it('retains the last-known-good step list when the YAML becomes unparseable', async () => {
    jest.useFakeTimers();
    const { store } = renderMinimap(TWO_STEP_YAML);

    // Verify pills are showing before breaking the YAML.
    await act(async () => {
      jest.runAllTimers();
    });
    expect(screen.getByTitle('step-a')).toBeInTheDocument();

    // Dispatch broken YAML — middleware debounces computation for 250ms.
    act(() => {
      store.dispatch(setYamlString(BROKEN_YAML));
    });

    // Advance past the debounce — workflowLookup collapses to nothing.
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    // The minimap should still show the previous step list (lastNonEmptyRef guard).
    expect(screen.getByTitle('step-a')).toBeInTheDocument();
    expect(screen.getByTitle('step-b')).toBeInTheDocument();

    jest.useRealTimers();
  });

  it('shows the viewport indicator when not all steps are visible', async () => {
    // getVisibleRanges returns only a partial range — step-b's lines are outside.
    const { editor } = renderMinimap(TWO_STEP_YAML, {
      getVisibleRanges: jest.fn(() => [{ startLineNumber: 1, endLineNumber: 2 }]),
    } as any);

    // Trigger the scroll listener so visibleLineRange state is updated.
    const scrollHandler = (editor.onDidScrollChange as jest.Mock).mock.calls[0]?.[0];
    if (scrollHandler) {
      act(() => scrollHandler());
    }

    await waitFor(() => {
      // The indicator renders with aria-hidden="true" (it's decorative geometry).
      const indicators = document.querySelectorAll('[aria-hidden="true"]');
      // At least one indicator div should be rendered.
      expect(indicators.length).toBeGreaterThan(0);
    });
  });

  it('clicking a pill reveals the line in the editor and keeps focus on the pill', async () => {
    const { editor } = renderMinimap(TWO_STEP_YAML, {
      getVisibleRanges: jest.fn(() => [{ startLineNumber: 1, endLineNumber: 10 }]),
    } as any);

    await waitFor(() => {
      expect(screen.getByTitle('step-a')).toBeInTheDocument();
    });

    const pill = screen.getByTitle('step-a');

    // Simulate a keyboard click (detail === 0 — Enter/Space). Focus must survive.
    Object.defineProperty(pill, 'blur', { value: jest.fn(), writable: true });
    fireEvent.click(pill, { detail: 0 });

    // revealLineInCenter and focus should be called (editor navigation).
    expect(editor.revealLineInCenter).toHaveBeenCalled();
    expect(editor.focus).toHaveBeenCalled();
    // blur must NOT have been called for keyboard activation.
    expect(pill.blur).not.toHaveBeenCalled();
  });

  it('pointer-clicking a pill blurs the button (so it loses the focus ring)', async () => {
    renderMinimap(TWO_STEP_YAML, {
      getVisibleRanges: jest.fn(() => [{ startLineNumber: 1, endLineNumber: 10 }]),
    } as any);

    await waitFor(() => {
      expect(screen.getByTitle('step-a')).toBeInTheDocument();
    });

    const pill = screen.getByTitle('step-a');
    const blurSpy = jest.spyOn(pill, 'blur');

    // Simulate a mouse click (detail === 1).
    fireEvent.click(pill, { detail: 1 });

    expect(blurSpy).toHaveBeenCalledTimes(1);
  });

  it('does not change scrollTop when the viewport band is already within the minimap view', async () => {
    const store = createMockStore();
    store.dispatch(setYamlString(TWO_STEP_YAML));

    const { editor: editorInstance } = createMockMonacoEditor(TWO_STEP_YAML, {
      getVisibleRanges: jest.fn(() => [{ startLineNumber: 1, endLineNumber: 10 }]),
    } as any);

    // Explicitly set up a scrollContainer that is tall enough to contain the band.
    let containerEl: HTMLDivElement | null = null;
    const scrollContainerRef = { current: null } as React.MutableRefObject<HTMLDivElement | null>;

    render(
      <div
        ref={(el) => {
          containerEl = el as HTMLDivElement | null;
          scrollContainerRef.current = containerEl;
        }}
        style={{ height: '500px', overflowY: 'auto' }}
      >
        <WorkflowStepMinimap
          editor={editorInstance}
          validationErrors={[]}
          scrollContainerRef={scrollContainerRef as React.RefObject<HTMLDivElement | null>}
        />
      </div>,
      { wrapper: getTestProvider({ store }) }
    );

    // Record scrollTop before any scroll event.
    const scrollTopBefore = containerEl ? (containerEl as HTMLDivElement).scrollTop : -1;

    // Fire a scroll update — the band should already be visible, so scrollTop stays.
    const scrollHandler = (editorInstance.onDidScrollChange as jest.Mock).mock.calls[0]?.[0];
    if (scrollHandler) {
      act(() => scrollHandler());
    }

    await waitFor(() => {
      const scrollTopAfter = containerEl ? (containerEl as HTMLDivElement).scrollTop : -1;
      expect(scrollTopAfter).toBe(scrollTopBefore);
    });
  });
});
