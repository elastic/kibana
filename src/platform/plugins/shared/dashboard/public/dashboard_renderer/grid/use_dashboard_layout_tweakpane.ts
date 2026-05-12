/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';

import { DASHBOARD_HORIZONTAL_PADDING_PX, DASHBOARD_MARGIN_SIZE } from './constants';

/** Published `Pane` typings omit `addBinding` (it lives on the runtime prototype). */
interface TweakpanePaneWithBindings {
  addBinding<T extends Record<string, unknown>>(
    target: T,
    key: keyof T,
    options: { label: string; min: number; max: number; step: number }
  ): {
    on(event: 'change', handler: (ev: { value: unknown }) => void): void;
  };
  dispose(): void;
}

export interface DashboardLayoutTweakpaneValues {
  marginGutterPx: number;
  horizontalPaddingPx: number;
}

/**
 * Live dashboard layout tuning via [Tweakpane](https://tweakpane.github.io/docs/): grid gutter
 * (when margins are on) and viewport left/right padding. Pane is fixed bottom-right while the
 * dashboard viewport is mounted.
 */
export function useDashboardLayoutTweakpane(): DashboardLayoutTweakpaneValues {
  const [marginGutterPx, setMarginGutterPx] = useState(DASHBOARD_MARGIN_SIZE);
  const [horizontalPaddingPx, setHorizontalPaddingPx] = useState(DASHBOARD_HORIZONTAL_PADDING_PX);

  useEffect(() => {
    let cancelled = false;
    let disposePane: (() => void) | undefined;

    void import('tweakpane').then(({ Pane }) => {
      if (cancelled) {
        return;
      }

      const container = document.createElement('div');
      container.style.cssText = [
        'position:fixed',
        'right:12px',
        'bottom:12px',
        'z-index:100000',
        'pointer-events:auto',
      ].join(';');
      container.dataset.testSubj = 'dashboardLayoutTweakpane';
      document.body.appendChild(container);

      const params = {
        marginGutterPx: DASHBOARD_MARGIN_SIZE,
        horizontalPaddingPx: DASHBOARD_HORIZONTAL_PADDING_PX,
      };

      const pane = new Pane({
        container,
        title: 'Dashboard layout',
        expanded: true,
      }) as unknown as TweakpanePaneWithBindings;

      const readNumber = (value: unknown): number | undefined => {
        if (typeof value === 'number' && Number.isFinite(value)) {
          return value;
        }
        if (typeof value === 'string') {
          const parsed = Number(value);
          return Number.isFinite(parsed) ? parsed : undefined;
        }
        return undefined;
      };

      pane
        .addBinding(params, 'marginGutterPx', {
          label: 'Gutter (px)',
          min: 0,
          max: 48,
          step: 1,
        })
        .on('change', (ev) => {
          const next = readNumber(ev.value) ?? params.marginGutterPx;
          setMarginGutterPx(next);
        });

      pane
        .addBinding(params, 'horizontalPaddingPx', {
          label: 'Side padding (px)',
          min: 0,
          max: 200,
          step: 1,
        })
        .on('change', (ev) => {
          const next = readNumber(ev.value) ?? params.horizontalPaddingPx;
          setHorizontalPaddingPx(next);
        });

      setMarginGutterPx(params.marginGutterPx);
      setHorizontalPaddingPx(params.horizontalPaddingPx);

      disposePane = () => {
        pane.dispose();
        container.remove();
      };
    });

    return () => {
      cancelled = true;
      disposePane?.();
    };
  }, []);

  return { marginGutterPx, horizontalPaddingPx };
}
