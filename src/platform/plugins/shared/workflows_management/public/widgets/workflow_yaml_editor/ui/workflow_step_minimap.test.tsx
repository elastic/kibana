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
import type { YamlValidationErrorSeverity, YamlValidationResult } from '@kbn/workflows-yaml';
import { WorkflowStepMinimap } from './workflow_step_minimap';
import { setCursorPosition, setYamlString } from '../../../entities/workflows/store';
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

const THREE_STEP_YAML = `\
steps:
  - name: step-a
    type: slack.sendMessage
  - name: step-b
    type: slack.sendMessage
  - name: step-c
    type: slack.sendMessage
`;

// `parent` owns lines 2–5 (its own content ends where `child` starts); `child` is line 6–7.
const NESTED_STEP_YAML = `\
steps:
  - name: parent
    type: if
    condition: "true"
    steps:
      - name: child
        type: slack.sendMessage
`;
const PARENT_OWN_LINE = 3;
const CHILD_LINE = 7;

const BROKEN_YAML = ': : invalid yaml : : :';

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeMarker = (
  startLineNumber: number,
  severity: YamlValidationErrorSeverity
): Extract<YamlValidationResult, { owner: 'yaml' }> => ({
  id: `marker-${startLineNumber}`,
  owner: 'yaml',
  ruleId: 'yamlSyntaxError',
  severity,
  startLineNumber,
  startColumn: 1,
  endLineNumber: startLineNumber,
  endColumn: 80,
  message: 'test marker',
  hoverMessage: null,
});

/** Renders the minimap with a store pre-seeded with the given YAML. */
const renderMinimap = (
  yaml: string,
  editorOverrides?: Partial<ReturnType<typeof createMockMonacoEditor>['editor']>,
  validationErrors: YamlValidationResult[] = []
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
        validationErrors={validationErrors}
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

  describe('keyboard navigation', () => {
    const getPills = () => ['step-a', 'step-b', 'step-c'].map((id) => screen.getByTitle(id));
    const getTabStops = () => getPills().filter((pill) => pill.tabIndex === 0);

    it('groups the step buttons in a labelled, vertical toolbar inside the navigation landmark', async () => {
      renderMinimap(THREE_STEP_YAML);

      const toolbar = await screen.findByRole('toolbar', { name: 'Workflow steps' });
      expect(toolbar).toHaveAttribute('aria-orientation', 'vertical');
      expect(screen.getByRole('navigation')).toContainElement(toolbar);
      getPills().forEach((pill) => expect(toolbar).toContainElement(pill));
    });

    it('exposes a single tab stop on the first step when no step is current', async () => {
      renderMinimap(THREE_STEP_YAML);

      await waitFor(() => {
        expect(getTabStops()).toEqual([screen.getByTitle('step-a')]);
      });
      expect(getPills().map((pill) => pill.tabIndex)).toEqual([0, -1, -1]);
      expect(document.querySelectorAll('[aria-current]')).toHaveLength(0);
    });

    it('marks the step under the editor cursor as current and makes it the tab stop', async () => {
      const { store } = renderMinimap(THREE_STEP_YAML);
      await waitFor(() => {
        expect(screen.getByTitle('step-b')).toBeInTheDocument();
      });

      // Line 4 is the `- name: step-b` line.
      act(() => {
        store.dispatch(setCursorPosition({ lineNumber: 4, column: 1 }));
      });

      const stepB = screen.getByTitle('step-b');
      expect(stepB).toHaveAttribute('aria-current', 'step');
      expect(document.querySelectorAll('[aria-current]')).toHaveLength(1);
      expect(getTabStops()).toEqual([stepB]);
    });

    it('moves focus and the tab stop with ArrowDown/ArrowUp, stopping at the ends', async () => {
      renderMinimap(THREE_STEP_YAML);
      await waitFor(() => {
        expect(screen.getByTitle('step-a')).toBeInTheDocument();
      });
      const [stepA, stepB, stepC] = getPills();

      stepA.focus();
      fireEvent.keyDown(stepA, { key: 'ArrowUp' });
      expect(stepA).toHaveFocus();

      fireEvent.keyDown(stepA, { key: 'ArrowDown' });
      expect(stepB).toHaveFocus();
      expect(getTabStops()).toEqual([stepB]);

      fireEvent.keyDown(stepB, { key: 'ArrowDown' });
      expect(stepC).toHaveFocus();
      fireEvent.keyDown(stepC, { key: 'ArrowDown' });
      expect(stepC).toHaveFocus();
      expect(getTabStops()).toEqual([stepC]);

      fireEvent.keyDown(stepC, { key: 'ArrowUp' });
      expect(stepB).toHaveFocus();
    });

    it('jumps to the first and last step with Home and End', async () => {
      renderMinimap(THREE_STEP_YAML);
      await waitFor(() => {
        expect(screen.getByTitle('step-a')).toBeInTheDocument();
      });
      const [stepA, stepB, stepC] = getPills();

      stepB.focus();
      fireEvent.keyDown(stepB, { key: 'End' });
      expect(stepC).toHaveFocus();
      expect(getTabStops()).toEqual([stepC]);

      fireEvent.keyDown(stepC, { key: 'Home' });
      expect(stepA).toHaveFocus();
      expect(getTabStops()).toEqual([stepA]);
    });

    it('does not move the editor cursor while navigating with the arrow keys', async () => {
      const { editor } = renderMinimap(THREE_STEP_YAML);
      await waitFor(() => {
        expect(screen.getByTitle('step-a')).toBeInTheDocument();
      });
      const [stepA] = getPills();

      stepA.focus();
      fireEvent.keyDown(stepA, { key: 'ArrowDown' });

      expect(editor.setPosition).not.toHaveBeenCalled();
      expect(editor.focus).not.toHaveBeenCalled();
    });

    it('returns the tab stop to the current step once focus leaves the minimap', async () => {
      const { store } = renderMinimap(THREE_STEP_YAML);
      await waitFor(() => {
        expect(screen.getByTitle('step-a')).toBeInTheDocument();
      });
      act(() => {
        store.dispatch(setCursorPosition({ lineNumber: 4, column: 1 }));
      });
      const [stepA, stepB, stepC] = getPills();

      stepB.focus();
      fireEvent.keyDown(stepB, { key: 'End' });
      expect(getTabStops()).toEqual([stepC]);

      // Focus moves to an element outside of the minimap.
      const outside = document.createElement('button');
      document.body.appendChild(outside);
      act(() => {
        outside.focus();
      });

      expect(getTabStops()).toEqual([stepB]);
      expect(stepA.tabIndex).toBe(-1);
      outside.remove();
    });
  });

  describe('screen-reader severity text', () => {
    it.each<{
      case: string;
      line: number;
      severity: YamlValidationErrorSeverity;
      expected: string;
      notExpected: string;
    }>([
      {
        case: 'own warning',
        line: PARENT_OWN_LINE,
        severity: 'warning',
        expected: 'has warnings',
        notExpected: 'error',
      },
      {
        case: 'own error',
        line: PARENT_OWN_LINE,
        severity: 'error',
        expected: 'has errors',
        notExpected: 'warning',
      },
      {
        case: 'inherited warning',
        line: CHILD_LINE,
        severity: 'warning',
        expected: 'contains steps with warnings',
        notExpected: 'error',
      },
      {
        case: 'inherited error',
        line: CHILD_LINE,
        severity: 'error',
        expected: 'contains steps with errors',
        notExpected: 'warning',
      },
    ])('announces "$expected" for an $case on the parent step', async (testCase) => {
      renderMinimap(NESTED_STEP_YAML, undefined, [makeMarker(testCase.line, testCase.severity)]);

      const parentButton = await screen.findByTitle('parent');
      expect(parentButton).toHaveTextContent(testCase.expected);
      expect(parentButton).not.toHaveTextContent(testCase.notExpected);
    });
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
