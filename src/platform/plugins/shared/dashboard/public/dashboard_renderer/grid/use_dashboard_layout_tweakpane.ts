/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { DashboardLayoutTweakpaneValues } from '../../dashboard_api/types';
import { DASHBOARD_HORIZONTAL_PADDING_PX, DASHBOARD_MARGIN_SIZE } from './constants';
import {
  DASHBOARD_DEFAULT_BACKGROUND_TOKEN,
  getDashboardBackgroundBaseTokenOptions,
  type DashboardBackgroundBaseToken,
} from './dashboard_background_tokens';

/** Parse EUI border radius tokens (e.g. `6px`, `0.375rem`) into pixels for Tweakpane. */
export function parseCssLengthToPx(value: string | number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const s = String(value).trim();
  const pxMatch = /^(\d+(?:\.\d+)?)px$/i.exec(s);
  if (pxMatch) {
    return Number(pxMatch[1]);
  }
  const remMatch = /^(\d+(?:\.\d+)?)rem$/i.exec(s);
  if (remMatch && typeof document !== 'undefined') {
    const rootPx = Number.parseFloat(getComputedStyle(document.documentElement).fontSize || '16');
    return Number(remMatch[1]) * rootPx;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

type TweakpaneChangeHandler = (ev: { value: unknown }) => void;

interface TweakpaneBindingApi {
  on(type: 'change', handler: TweakpaneChangeHandler): void;
}

interface DashboardLayoutTweakpanePane {
  addBinding(
    target: Record<string, unknown>,
    key: string,
    options:
      | { label: string; min: number; max: number; step: number }
      | { label: string; options: ReadonlyArray<{ text: string; value: string }> }
  ): TweakpaneBindingApi;
  dispose(): void;
}

/**
 * Live dashboard layout tuning via [Tweakpane](https://tweakpane.github.io/docs/): grid gutter
 * (when margins are on), viewport left/right padding, panel corner radius (defaults to the
 * active EUI theme `border.radius.medium` value), per-panel inner padding (vertical and horizontal,
 * 0–30 px), and dashboard canvas background using EUI `backgroundBase*` tokens (see
 * https://eui.elastic.co/docs/getting-started/theming/tokens/colors/#background-colors).
 * Pane is fixed bottom-right while the dashboard viewport is mounted.
 */
export function useDashboardLayoutTweakpane(): DashboardLayoutTweakpaneValues {
  const { euiTheme } = useEuiTheme();
  const euiThemeRef = useRef(euiTheme);
  euiThemeRef.current = euiTheme;

  const defaultPanelBorderRadiusPx = useMemo(
    () => parseCssLengthToPx(euiTheme.border.radius.medium as string | number),
    [euiTheme.border.radius.medium]
  );
  const defaultPanelRadiusRef = useRef(defaultPanelBorderRadiusPx);
  defaultPanelRadiusRef.current = defaultPanelBorderRadiusPx;

  const [marginGutterPx, setMarginGutterPx] = useState(DASHBOARD_MARGIN_SIZE);
  const [horizontalPaddingPx, setHorizontalPaddingPx] = useState(DASHBOARD_HORIZONTAL_PADDING_PX);
  const [panelBorderRadiusPx, setPanelBorderRadiusPx] = useState(defaultPanelBorderRadiusPx);
  const [panelPaddingVerticalPx, setPanelPaddingVerticalPx] = useState(0);
  const [panelPaddingHorizontalPx, setPanelPaddingHorizontalPx] = useState(0);
  const [dashboardBackgroundToken, setDashboardBackgroundToken] =
    useState<DashboardBackgroundBaseToken>(DASHBOARD_DEFAULT_BACKGROUND_TOKEN);

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

      const bgOptions = getDashboardBackgroundBaseTokenOptions(euiThemeRef.current.colors);

      const params = {
        marginGutterPx: DASHBOARD_MARGIN_SIZE,
        horizontalPaddingPx: DASHBOARD_HORIZONTAL_PADDING_PX,
        panelBorderRadiusPx: defaultPanelRadiusRef.current,
        panelPaddingVerticalPx: 0,
        panelPaddingHorizontalPx: 0,
        dashboardBackgroundToken: DASHBOARD_DEFAULT_BACKGROUND_TOKEN,
      };

      const pane = new Pane({
        container,
        title: 'Dashboard layout',
        expanded: true,
      }) as unknown as DashboardLayoutTweakpanePane;

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

      pane
        .addBinding(params, 'panelBorderRadiusPx', {
          label: 'Panel radius (px)',
          min: 0,
          max: 48,
          step: 1,
        })
        .on('change', (ev) => {
          const next = readNumber(ev.value) ?? params.panelBorderRadiusPx;
          setPanelBorderRadiusPx(next);
        });

      pane
        .addBinding(params, 'panelPaddingVerticalPx', {
          label: 'Panel vertical padding',
          min: 0,
          max: 30,
          step: 1,
        })
        .on('change', (ev) => {
          const next = readNumber(ev.value) ?? params.panelPaddingVerticalPx;
          setPanelPaddingVerticalPx(Math.min(30, Math.max(0, next)));
        });

      pane
        .addBinding(params, 'panelPaddingHorizontalPx', {
          label: 'Panel horizontal padding',
          min: 0,
          max: 30,
          step: 1,
        })
        .on('change', (ev) => {
          const next = readNumber(ev.value) ?? params.panelPaddingHorizontalPx;
          setPanelPaddingHorizontalPx(Math.min(30, Math.max(0, next)));
        });

      pane
        .addBinding(params, 'dashboardBackgroundToken', {
          label: 'Dashboard background',
          options:
            bgOptions.length > 0
              ? bgOptions
              : [{ text: 'Subdued', value: DASHBOARD_DEFAULT_BACKGROUND_TOKEN }],
        })
        .on('change', (ev) => {
          const next = typeof ev.value === 'string' ? ev.value : params.dashboardBackgroundToken;
          setDashboardBackgroundToken(next);
        });

      setMarginGutterPx(params.marginGutterPx);
      setHorizontalPaddingPx(params.horizontalPaddingPx);
      setPanelBorderRadiusPx(params.panelBorderRadiusPx);
      setPanelPaddingVerticalPx(params.panelPaddingVerticalPx);
      setPanelPaddingHorizontalPx(params.panelPaddingHorizontalPx);
      setDashboardBackgroundToken(params.dashboardBackgroundToken);

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

  return {
    marginGutterPx,
    horizontalPaddingPx,
    panelBorderRadiusPx,
    panelPaddingVerticalPx,
    panelPaddingHorizontalPx,
    dashboardBackgroundToken,
  };
}
