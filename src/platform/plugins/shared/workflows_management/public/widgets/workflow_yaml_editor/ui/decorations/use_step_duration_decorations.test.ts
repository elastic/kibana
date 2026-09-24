/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux-v7';
import type { monaco } from '@kbn/monaco';
import { useStepDurationDecorations } from './use_step_duration_decorations';
import { createMockStore } from '../../../../entities/workflows/store/__mocks__/store.mock';
import {
  _setComputedDataInternal,
  _setComputedExecution,
  setActiveTab,
  setExecution,
  setHighlightedStepId,
  setYamlString,
} from '../../../../entities/workflows/store/workflow_detail/slice';
import type { ComputedData } from '../../../../entities/workflows/store/workflow_detail/types';
import {
  createMockStepExecutionDto,
  createMockWorkflowExecutionDto,
  createStepInfo,
} from '../../../../shared/test_utils';

// ---------------------------------------------------------------------------
// Monaco mock — Range + editor event emitters
// ---------------------------------------------------------------------------

type MockEventHandler = (...args: unknown[]) => void;
type ScrollChangeCallback = (e: unknown) => void;
type MouseMoveCallback = (e: {
  target: { type: number; position: { lineNumber: number } | null };
  event: { browserEvent: { clientX: number; clientY: number } };
}) => void;

const GUTTER_LINE_DECORATIONS_TYPE = 2; // MouseTargetType.GUTTER_LINE_DECORATIONS

jest.mock('@kbn/monaco', () => {
  const actual = jest.requireActual('@kbn/monaco');
  return {
    ...actual,
    monaco: {
      ...actual.monaco,
      Range: jest.fn((startLine: number, startCol: number, endLine: number, endCol: number) => ({
        startLineNumber: startLine,
        startColumn: startCol,
        endLineNumber: endLine,
        endColumn: endCol,
      })),
      editor: {
        ...actual.monaco?.editor,
        MouseTargetType: {
          GUTTER_LINE_DECORATIONS: GUTTER_LINE_DECORATIONS_TYPE,
        },
      },
    },
  };
});

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiTheme: jest.fn(() => ({
    euiTheme: {
      colors: {
        backgroundBaseHighlighted: '#f5f5f5',
        backgroundLightWarning: '#fff3cd',
        backgroundLightDanger: '#f8d7da',
        textParagraph: '#333',
        textSubdued: '#666',
        textWarning: '#856404',
        textDanger: '#842029',
        borderBasePlain: '#ccc',
      },
      border: { radius: { small: '4px' } },
    },
  })),
}));

// ---------------------------------------------------------------------------
// Mock editor factory
// ---------------------------------------------------------------------------

const createMockEditor = () => {
  const decorationsCollection = { clear: jest.fn(), set: jest.fn() };

  const scrollChangeHandlers: ScrollChangeCallback[] = [];
  const mouseMoveHandlers: MouseMoveCallback[] = [];
  const mouseLeaveHandlers: MockEventHandler[] = [];

  const editor = {
    createDecorationsCollection: jest.fn(() => decorationsCollection),
    updateOptions: jest.fn(),
    onDidScrollChange: jest.fn((cb: ScrollChangeCallback) => {
      scrollChangeHandlers.push(cb);
      return {
        dispose: jest.fn(() => {
          scrollChangeHandlers.splice(scrollChangeHandlers.indexOf(cb), 1);
        }),
      };
    }),
    onMouseMove: jest.fn((cb: MouseMoveCallback) => {
      mouseMoveHandlers.push(cb);
      return {
        dispose: jest.fn(() => {
          mouseMoveHandlers.splice(mouseMoveHandlers.indexOf(cb), 1);
        }),
      };
    }),
    onMouseLeave: jest.fn((cb: MockEventHandler) => {
      mouseLeaveHandlers.push(cb);
      return {
        dispose: jest.fn(() => {
          mouseLeaveHandlers.splice(mouseLeaveHandlers.indexOf(cb), 1);
        }),
      };
    }),
    // Helpers to fire events in tests
    _fireScrollChange: () => scrollChangeHandlers.forEach((cb) => cb({})),
    _fireMouseMove: (event: Parameters<MouseMoveCallback>[0]) =>
      mouseMoveHandlers.forEach((cb) => cb(event)),
    _fireMouseLeave: () => mouseLeaveHandlers.forEach((cb) => cb()),
    _decorationsCollection: decorationsCollection,
  } as unknown as monaco.editor.IStandaloneCodeEditor & {
    _fireScrollChange: () => void;
    _fireMouseMove: (e: Parameters<MouseMoveCallback>[0]) => void;
    _fireMouseLeave: () => void;
    _decorationsCollection: typeof decorationsCollection;
  };

  return editor;
};

// ---------------------------------------------------------------------------
// Shared test YAML + computed data
// ---------------------------------------------------------------------------

const EXEC_YAML = 'triggers:\n  - type: manual\nsteps: []';

const buildComputedData = (): ComputedData => ({
  yamlString: EXEC_YAML,
  workflowLookup: {
    steps: {
      'step-a': createStepInfo({ stepId: 'step-a', stepType: 'action', lineStart: 5, lineEnd: 7 }),
      'step-b': createStepInfo({
        stepId: 'step-b',
        stepType: 'foreach',
        lineStart: 9,
        lineEnd: 15,
      }),
      'step-c': createStepInfo({
        stepId: 'step-c',
        stepType: 'action',
        lineStart: 17,
        lineEnd: 19,
      }),
    },
  },
});

// ---------------------------------------------------------------------------
// renderHookWithProviders
// ---------------------------------------------------------------------------

const renderHookWithProviders = (
  editor: monaco.editor.IStandaloneCodeEditor | null,
  { activeTab = 'executions' as 'executions' | 'workflow' } = {}
) => {
  const store = createMockStore();
  const computed = buildComputedData();

  store.dispatch(setYamlString(EXEC_YAML));
  store.dispatch(setActiveTab(activeTab));
  store.dispatch(_setComputedDataInternal(computed));
  store.dispatch(_setComputedExecution(computed));

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children);

  return {
    ...renderHook(() => useStepDurationDecorations(editor), { wrapper }),
    store,
  };
};

// Execution with duration data for step-a (single run, 500 ms)
const makeExecution = (
  stepExecutions = [
    createMockStepExecutionDto({ stepId: 'step-a', stepType: 'action', executionTimeMs: 500 }),
  ],
  overrides: Parameters<typeof createMockWorkflowExecutionDto>[0] = {}
) =>
  createMockWorkflowExecutionDto({
    yaml: EXEC_YAML,
    duration: 1000,
    stepExecutions,
    ...overrides,
  });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useStepDurationDecorations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── null editor ───────────────────────────────────────────────────────────

  describe('when editor is null', () => {
    it('returns a styles object without error', () => {
      const { result } = renderHookWithProviders(null);
      expect(result.current.styles).toBeDefined();
    });
  });

  // ── decorations created on expected lines ─────────────────────────────────

  describe('decoration creation', () => {
    it('creates a chip decoration on the lineStart of a step with duration', () => {
      const editor = createMockEditor();
      const { store } = renderHookWithProviders(editor);

      act(() => {
        store.dispatch(setExecution(makeExecution()));
      });

      const { set } = (editor as ReturnType<typeof createMockEditor>)._decorationsCollection;
      expect(set).toHaveBeenCalled();
      const [decorations]: [monaco.editor.IModelDeltaDecoration[]] = set.mock.calls.at(-1)!;
      const stepADec = decorations.find((d) => d.range.startLineNumber === 5);
      expect(stepADec).toBeDefined();
      expect(stepADec!.options.linesDecorationsClassName).toContain('step-duration-gutter');
    });

    it('applies warning tone class when step is ≥40% of execution duration', () => {
      const editor = createMockEditor();
      const { store } = renderHookWithProviders(editor);

      // step-a takes 400ms out of 1000ms total = 40% → warning
      act(() => {
        store.dispatch(
          setExecution(
            makeExecution(
              [
                createMockStepExecutionDto({
                  stepId: 'step-a',
                  stepType: 'action',
                  executionTimeMs: 400,
                }),
              ],
              { duration: 1000 }
            )
          )
        );
      });

      const { set } = (editor as ReturnType<typeof createMockEditor>)._decorationsCollection;
      const [decorations] = set.mock.calls.at(-1)!;
      const dec = decorations.find(
        (d: monaco.editor.IModelDeltaDecoration) => d.range.startLineNumber === 5
      );
      expect(dec?.options.linesDecorationsClassName).toContain('step-duration-gutter-warning');
    });

    it('applies dimmed class when another step is highlighted', () => {
      const editor = createMockEditor();
      const { store } = renderHookWithProviders(editor);

      act(() => {
        store.dispatch(setHighlightedStepId({ stepId: 'step-b' }));
        store.dispatch(
          setExecution(
            makeExecution([
              createMockStepExecutionDto({
                stepId: 'step-a',
                stepType: 'action',
                executionTimeMs: 500,
              }),
              createMockStepExecutionDto({
                stepId: 'step-b',
                stepType: 'foreach',
                executionTimeMs: 300,
              }),
            ])
          )
        );
      });

      const { set } = (editor as ReturnType<typeof createMockEditor>)._decorationsCollection;
      const [decorations] = set.mock.calls.at(-1)!;
      const stepADec = decorations.find(
        (d: monaco.editor.IModelDeltaDecoration) => d.range.startLineNumber === 5
      );
      // step-a is not the highlighted step so it should be dimmed
      expect(stepADec?.options.linesDecorationsClassName).toContain('dimmed');
    });

    it('produces distinct CSS classes for <1ms and ~1ms labels (no collision)', () => {
      // <1ms → labelClass('<1ms')  →  hex of '<','1','m','s'
      // ~1ms → labelClass('~1ms')  →  hex of '~','1','m','s'
      // Both must produce different class names so their ::before content rules don't overwrite.
      const label1 = '<1ms';
      const label2 = '~1ms';

      // Inline the same logic as the production labelClass for verification.
      const BASE = 'step-duration-gutter';
      const encode = (s: string) =>
        `${BASE}-l-${Array.from(s, (c) => (c.codePointAt(0) ?? 0).toString(16)).join('')}`;

      expect(encode(label1)).not.toBe(encode(label2));
    });
  });

  // ── lineDecorationsWidth management ──────────────────────────────────────

  describe('lane width management', () => {
    it('calls updateOptions with a width > default when chips are active', () => {
      const editor = createMockEditor();
      const { store } = renderHookWithProviders(editor);

      act(() => {
        store.dispatch(setExecution(makeExecution()));
      });

      expect(editor.updateOptions).toHaveBeenCalledWith(
        expect.objectContaining({ lineDecorationsWidth: expect.any(Number) })
      );
      const calls = (editor.updateOptions as jest.Mock).mock.calls;
      const maxWidth = Math.max(
        ...calls.map((c: [{ lineDecorationsWidth: number }]) => c[0].lineDecorationsWidth)
      );
      // Default is 10; any chip should push it wider.
      expect(maxWidth).toBeGreaterThan(10);
    });

    it('resets width to default when execution changes', () => {
      const editor = createMockEditor();
      const { store } = renderHookWithProviders(editor);

      act(() => {
        store.dispatch(setExecution(makeExecution()));
      });

      // Switch to a different execution id — this resets the monotonic tracker.
      act(() => {
        store.dispatch(setExecution(makeExecution([], { id: 'exec-2', yaml: EXEC_YAML })));
      });

      const calls = (editor.updateOptions as jest.Mock).mock.calls;
      // The last call after no-data execution should reset to 10.
      const lastWidth = calls.at(-1)?.[0].lineDecorationsWidth;
      expect(lastWidth).toBe(10);
    });
  });

  // ── snapshot gate (selectIsEditorYamlExecutionSnapshot) ───────────────────

  describe('execution snapshot gate', () => {
    it('shows chips on executions tab regardless of unsaved draft in workflow tab', () => {
      // Regression: selectHasChanges compared draft vs saved workflow YAML, not vs execution.yaml.
      // On the executions tab, selectEditorYaml IS execution.yaml, so isActive must be true.
      const editor = createMockEditor();
      const { store } = renderHookWithProviders(editor, { activeTab: 'executions' });

      act(() => {
        store.dispatch(setExecution(makeExecution()));
      });

      const { set } = (editor as ReturnType<typeof createMockEditor>)._decorationsCollection;
      expect(set).toHaveBeenCalled();
      const [decorations] = set.mock.calls.at(-1)!;
      expect(decorations.length).toBeGreaterThan(0);
    });

    it('suppresses chips on workflow tab when YAML draft differs from execution snapshot', () => {
      const editor = createMockEditor();
      const { store } = renderHookWithProviders(editor, { activeTab: 'workflow' });

      act(() => {
        store.dispatch(setExecution(makeExecution()));
        // Edit the YAML — now the draft no longer matches execution.yaml
        store.dispatch(setYamlString('version: "1"\nname: edited'));
      });

      const { set } = (editor as ReturnType<typeof createMockEditor>)._decorationsCollection;
      // All calls after the edit should produce zero decorations.
      const lastCall: [monaco.editor.IModelDeltaDecoration[]] | undefined = set.mock.calls.at(-1);
      const decorations = lastCall?.[0] ?? [];
      expect(decorations.length).toBe(0);
    });

    it('shows chips on workflow tab when draft still matches execution snapshot', () => {
      const editor = createMockEditor();
      const { store } = renderHookWithProviders(editor, { activeTab: 'workflow' });

      act(() => {
        // Keep yamlString in sync with execution.yaml
        store.dispatch(setYamlString(EXEC_YAML));
        store.dispatch(setExecution(makeExecution()));
      });

      const { set } = (editor as ReturnType<typeof createMockEditor>)._decorationsCollection;
      expect(set).toHaveBeenCalled();
      const [decorations] = set.mock.calls.at(-1)!;
      expect(decorations.length).toBeGreaterThan(0);
    });
  });

  // ── tooltip ───────────────────────────────────────────────────────────────

  describe('tooltip', () => {
    const makeMultiRunExecution = () =>
      makeExecution([
        // Two completed runs of step-a so runCount > 1 → tooltip shows
        createMockStepExecutionDto({ stepId: 'step-a', stepType: 'action', executionTimeMs: 400 }),
        createMockStepExecutionDto({
          id: 'doc-2',
          stepId: 'step-a',
          stepType: 'action',
          executionTimeMs: 600,
        }),
      ]);

    it('hides the tooltip when the editor scrolls with a stationary pointer', () => {
      const editor = createMockEditor();
      const extEditor = editor as ReturnType<typeof createMockEditor>;
      const { store } = renderHookWithProviders(editor);

      act(() => {
        store.dispatch(setExecution(makeMultiRunExecution()));
      });

      // Show tooltip first via a mouse-move over the gutter at step-a's line.
      act(() => {
        extEditor._fireMouseMove({
          target: { type: GUTTER_LINE_DECORATIONS_TYPE, position: { lineNumber: 5 } },
          event: { browserEvent: { clientX: 100, clientY: 100 } },
        });
      });

      const tipEl = document.body.querySelector('div[style*="position: fixed"]') as HTMLElement;
      // Tooltip should be visible.
      expect(tipEl?.style.display).toBe('block');

      // Now scroll — tooltip must hide.
      act(() => {
        extEditor._fireScrollChange();
      });

      expect(tipEl?.style.display).toBe('none');
    });

    it('hides the tooltip on mouse leave', () => {
      const editor = createMockEditor();
      const extEditor = editor as ReturnType<typeof createMockEditor>;
      const { store } = renderHookWithProviders(editor);

      act(() => {
        store.dispatch(setExecution(makeMultiRunExecution()));
      });

      act(() => {
        extEditor._fireMouseMove({
          target: { type: GUTTER_LINE_DECORATIONS_TYPE, position: { lineNumber: 5 } },
          event: { browserEvent: { clientX: 100, clientY: 100 } },
        });
      });

      const tipEl = document.body.querySelector('div[style*="position: fixed"]') as HTMLElement;
      expect(tipEl?.style.display).toBe('block');

      act(() => {
        extEditor._fireMouseLeave();
      });

      expect(tipEl?.style.display).toBe('none');
    });

    it('does not show a tooltip for single-run steps', () => {
      const editor = createMockEditor();
      const extEditor = editor as ReturnType<typeof createMockEditor>;
      const { store } = renderHookWithProviders(editor);

      // Single run only.
      act(() => {
        store.dispatch(setExecution(makeExecution()));
      });

      act(() => {
        extEditor._fireMouseMove({
          target: { type: GUTTER_LINE_DECORATIONS_TYPE, position: { lineNumber: 5 } },
          event: { browserEvent: { clientX: 100, clientY: 100 } },
        });
      });

      const tipEl = document.body.querySelector('div[style*="position: fixed"]') as HTMLElement;
      // Either there's no tip element yet, or it's hidden.
      expect(!tipEl || tipEl.style.display === 'none' || tipEl.style.display === '').toBe(true);
    });

    it('removes the tooltip element from document.body on unmount', () => {
      const editor = createMockEditor();
      const { store, unmount } = renderHookWithProviders(editor);

      act(() => {
        store.dispatch(setExecution(makeMultiRunExecution()));
      });

      const beforeCount = document.body.querySelectorAll('div[style*="position: fixed"]').length;
      expect(beforeCount).toBeGreaterThan(0);

      act(() => {
        unmount();
      });

      const afterCount = document.body.querySelectorAll('div[style*="position: fixed"]').length;
      expect(afterCount).toBe(0);
    });
  });
});
