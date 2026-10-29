/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * TEMPORARY DEMO ONLY — remove before shipping (this whole file + its two usages in
 * `entity_summary_badge.tsx`).
 *
 * A floating, page-level toggle that flips the `EntitySummary` metrics layout between the stacked
 * ("vertical") and side-by-side ("horizontal") variants so the two can be compared live. It keeps a
 * tiny module-level store so every open popover re-renders when the layout changes, and mounts its
 * button into a dedicated React root on `document.body` exactly once — independent of which grid
 * cells happen to be mounted at the time.
 */
import React, { useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';

type MetricsDirection = 'row' | 'column';

let direction: MetricsDirection = 'row';
const listeners = new Set<() => void>();

const getSnapshot = (): MetricsDirection => direction;

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const setDirection = (next: MetricsDirection): void => {
  direction = next;
  listeners.forEach((listener) => listener());
};

export const useLayoutDemoDirection = (): MetricsDirection =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

const FloatingToggle = () => {
  const current = useLayoutDemoDirection();
  const isHorizontal = current === 'row';
  const label = `Metrics layout: ${isHorizontal ? 'horizontal' : 'vertical'} — switch (demo)`;

  return (
    <button
      type="button"
      onClick={() => setDirection(isHorizontal ? 'column' : 'row')}
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 2147483647,
        padding: '8px 12px',
        borderRadius: 6,
        border: '1px solid #8e9bb3',
        background: '#1d2a3e',
        color: '#ffffff',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
};

let mounted = false;

export const ensureLayoutDemoMounted = (): void => {
  if (mounted || typeof document === 'undefined') {
    return;
  }
  mounted = true;
  const container = document.createElement('div');
  container.id = 'entitySummaryLayoutDemo';
  document.body.appendChild(container);
  createRoot(container).render(<FloatingToggle />);
};
