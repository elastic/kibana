/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * POC-only dev toggle panel for parked design decisions.
 *
 * Remove this file when specs 03–08 are implemented properly.
 *
 * NOTE: `nodePropsAreEqual` (workflow_graph_node.tsx) and `edgePropsAreEqual`
 * (workflow_graph_edge.tsx) enumerate compared fields explicitly. Any toggle
 * that changes node/edge `data` must be added there or the memo will swallow it.
 */

import { EuiButtonIcon, EuiFormRow, EuiPopover, EuiSwitch, EuiText, EuiTitle } from '@elastic/eui';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WorkflowGraphPocToggles {
  /** Whether fallback-lane steps can carry their own error ports (chainable). */
  fallbackDepth: 'single' | 'chainable';
  /** Where the "continue after fallback" affordance appears. */
  continueAfterFallbackPlacement: 'below-last-fallback' | 'menu-item';
  /** Where a duplicated step is inserted. */
  duplicatePlacement: 'after-original' | 'end-of-sequence';
  /** Whether the red fallback port is always visible or only on hover. */
  fallbackPortVisibility: 'hover-only' | 'always-visible';
}

const DEFAULTS: WorkflowGraphPocToggles = {
  fallbackDepth: 'single',
  continueAfterFallbackPlacement: 'below-last-fallback',
  duplicatePlacement: 'after-original',
  fallbackPortVisibility: 'hover-only',
};

// ── Persistence ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'workflows:poc-graph-toggles';

const readStored = (): Partial<WorkflowGraphPocToggles> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<WorkflowGraphPocToggles>) : {};
  } catch {
    return {};
  }
};

const writeStored = (t: WorkflowGraphPocToggles) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
  } catch {
    // localStorage unavailable — in-memory state is enough for a review session
  }
};

// ── Context ───────────────────────────────────────────────────────────────────

const TogglesContext = createContext<WorkflowGraphPocToggles>(DEFAULTS);
const SetterContext = createContext<(patch: Partial<WorkflowGraphPocToggles>) => void>(() => {});

export const WorkflowGraphPocTogglesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toggles, setToggles] = useState<WorkflowGraphPocToggles>(() => ({
    ...DEFAULTS,
    ...readStored(),
  }));
  const set = useCallback((patch: Partial<WorkflowGraphPocToggles>) => {
    setToggles((prev) => {
      const next = { ...prev, ...patch };
      writeStored(next);
      return next;
    });
  }, []);
  const value = useMemo(() => toggles, [toggles]);
  return (
    <TogglesContext.Provider value={value}>
      <SetterContext.Provider value={set}>{children}</SetterContext.Provider>
    </TogglesContext.Provider>
  );
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

export const useWorkflowGraphPocToggles = () => useContext(TogglesContext);
export const useWorkflowGraphPocTogglesSetter = () => useContext(SetterContext);

// ── Settings panel (gear icon — single entry point for all authoring controls) ─

export const WorkflowSettingsPanel: React.FC = () => {
  const toggles = useContext(TogglesContext);
  const set = useContext(SetterContext);
  const [isOpen, setIsOpen] = useState(false);

  const button = (
    <EuiButtonIcon
      iconType="gear"
      aria-label="Workflow authoring settings"
      onClick={() => setIsOpen((v) => !v)}
    />
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="s"
    >
      <EuiTitle size="xxxs">
        <h3>POC design toggles</h3>
      </EuiTitle>
      <EuiText size="xs" color="subdued" css={{ marginBottom: 8 }}>
        Parked decisions — flip live for the design review.
      </EuiText>
      <EuiFormRow display="columnCompressed" label="Fallback depth">
        <EuiSwitch
          label={toggles.fallbackDepth === 'chainable' ? 'Chainable' : '1 step'}
          checked={toggles.fallbackDepth === 'chainable'}
          onChange={(e) => set({ fallbackDepth: e.target.checked ? 'chainable' : 'single' })}
          compressed
        />
      </EuiFormRow>
      <EuiFormRow display="columnCompressed" label='"Continue after fallback"'>
        <EuiSwitch
          label={
            toggles.continueAfterFallbackPlacement === 'menu-item' ? '⋮ menu item' : 'Below lane'
          }
          checked={toggles.continueAfterFallbackPlacement === 'menu-item'}
          onChange={(e) =>
            set({
              continueAfterFallbackPlacement: e.target.checked
                ? 'menu-item'
                : 'below-last-fallback',
            })
          }
          compressed
        />
      </EuiFormRow>
      <EuiFormRow display="columnCompressed" label="Duplicate placement">
        <EuiSwitch
          label={
            toggles.duplicatePlacement === 'end-of-sequence' ? 'End of sequence' : 'After original'
          }
          checked={toggles.duplicatePlacement === 'end-of-sequence'}
          onChange={(e) =>
            set({ duplicatePlacement: e.target.checked ? 'end-of-sequence' : 'after-original' })
          }
          compressed
        />
      </EuiFormRow>
      <EuiFormRow display="columnCompressed" label="Red fallback port">
        <EuiSwitch
          label={
            toggles.fallbackPortVisibility === 'always-visible' ? 'Always visible' : 'Hover only'
          }
          checked={toggles.fallbackPortVisibility === 'always-visible'}
          onChange={(e) =>
            set({
              fallbackPortVisibility: e.target.checked ? 'always-visible' : 'hover-only',
            })
          }
          compressed
        />
      </EuiFormRow>
    </EuiPopover>
  );
};
