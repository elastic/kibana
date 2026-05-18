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
import {
  DASHBOARD_HORIZONTAL_PADDING_PX,
  DASHBOARD_MARGIN_SIZE,
  DASHBOARD_MARKDOWN_CORNER_PADDING_MAX_PX,
} from './constants';
import {
  DASHBOARD_DEFAULT_BACKGROUND_TOKEN,
  DASHBOARD_DEFAULT_PANEL_BACKGROUND_TOKEN,
  getDashboardBackgroundBaseTokenOptions,
  getDashboardBackgroundTokenOptions,
  type DashboardBackgroundBaseToken,
  type DashboardBackgroundToken,
} from './dashboard_background_tokens';
import {
  DASHBOARD_LAYOUT_TWEAKPANE_CURRENT_STATE_PRESET_ID,
  getDashboardLayoutTweakpanePresets,
} from './dashboard_layout_tweakpane_presets';

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
  /** Re-read bound object values and update all control displays (needed after programmatic updates). */
  refresh(): void;
  dispose(): void;
}

/**
 * Live dashboard layout tuning via [Tweakpane](https://tweakpane.github.io/docs/): presets
 * (named bundles of all layout values), then grid gutter
 * (when margins are on), viewport left/right padding, panel corner radius (defaults to the
 * active EUI theme `border.radius.medium` value), per-panel inner padding (vertical and horizontal,
 * 0–30 px), optional markdown-only corner padding (right/bottom, 0–400 px, linked to panel paddings until
 * changed), and dashboard canvas background using EUI `backgroundBase*` tokens (see
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
  const [markdownCornerPaddingRightPx, setMarkdownCornerPaddingRightPx] = useState(0);
  const [markdownCornerPaddingBottomPx, setMarkdownCornerPaddingBottomPx] = useState(0);
  const [dashboardBackgroundToken, setDashboardBackgroundToken] =
    useState<DashboardBackgroundBaseToken>(DASHBOARD_DEFAULT_BACKGROUND_TOKEN);
  const [lightModePanelBackgroundToken, setLightModePanelBackgroundToken] =
    useState<DashboardBackgroundToken>(DASHBOARD_DEFAULT_PANEL_BACKGROUND_TOKEN);
  const [darkModePanelBackgroundToken, setDarkModePanelBackgroundToken] =
    useState<DashboardBackgroundToken>(DASHBOARD_DEFAULT_PANEL_BACKGROUND_TOKEN);

  const markdownCornerUnlinkedFromPanelPaddingRef = useRef(false);

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

      const dashboardBgOptions = getDashboardBackgroundBaseTokenOptions(euiThemeRef.current.colors);
      const panelBgOptions = getDashboardBackgroundTokenOptions(euiThemeRef.current.colors);
      const presets = getDashboardLayoutTweakpanePresets(defaultPanelRadiusRef.current);

      const params = {
        marginGutterPx: DASHBOARD_MARGIN_SIZE,
        horizontalPaddingPx: DASHBOARD_HORIZONTAL_PADDING_PX,
        panelBorderRadiusPx: defaultPanelRadiusRef.current,
        panelPaddingVerticalPx: 0,
        panelPaddingHorizontalPx: 0,
        markdownCornerPaddingRightPx: 0,
        markdownCornerPaddingBottomPx: 0,
        dashboardBackgroundToken: DASHBOARD_DEFAULT_BACKGROUND_TOKEN,
        lightModePanelBackgroundToken: DASHBOARD_DEFAULT_PANEL_BACKGROUND_TOKEN,
        darkModePanelBackgroundToken: DASHBOARD_DEFAULT_PANEL_BACKGROUND_TOKEN,
      };

      const pane = new Pane({
        container,
        title: 'Dashboard layout',
        expanded: true,
      }) as unknown as DashboardLayoutTweakpanePane;

      const syncMarkdownCornerPaddingFromPanelPadding = () => {
        if (markdownCornerUnlinkedFromPanelPaddingRef.current) {
          return;
        }
        params.markdownCornerPaddingRightPx = params.panelPaddingHorizontalPx;
        params.markdownCornerPaddingBottomPx = params.panelPaddingVerticalPx;
        setMarkdownCornerPaddingRightPx(params.markdownCornerPaddingRightPx);
        setMarkdownCornerPaddingBottomPx(params.markdownCornerPaddingBottomPx);
        pane.refresh();
      };

      const applyLayoutTweakValues = (next: DashboardLayoutTweakpaneValues) => {
        params.marginGutterPx = next.marginGutterPx;
        params.horizontalPaddingPx = next.horizontalPaddingPx;
        params.panelBorderRadiusPx = next.panelBorderRadiusPx;
        params.panelPaddingVerticalPx = Math.min(30, Math.max(0, next.panelPaddingVerticalPx));
        params.panelPaddingHorizontalPx = Math.min(30, Math.max(0, next.panelPaddingHorizontalPx));

        const panelH = params.panelPaddingHorizontalPx;
        const panelV = params.panelPaddingVerticalPx;
        const markdownRightRaw = next.markdownCornerPaddingRightPx ?? panelH;
        const markdownBottomRaw = next.markdownCornerPaddingBottomPx ?? panelV;
        params.markdownCornerPaddingRightPx = Math.min(
          DASHBOARD_MARKDOWN_CORNER_PADDING_MAX_PX,
          Math.max(0, markdownRightRaw)
        );
        params.markdownCornerPaddingBottomPx = Math.min(
          DASHBOARD_MARKDOWN_CORNER_PADDING_MAX_PX,
          Math.max(0, markdownBottomRaw)
        );
        params.dashboardBackgroundToken = next.dashboardBackgroundToken;
        params.lightModePanelBackgroundToken = next.lightModePanelBackgroundToken;
        params.darkModePanelBackgroundToken = next.darkModePanelBackgroundToken;

        // Before `pane.refresh()`, which can re-fire other bindings' `change` handlers: if markdown
        // still matches panel padding, those handlers should sync (linked). If not, skip sync so
        // preset-specific markdown values (e.g. right 200 vs horizontal 12) are not overwritten.
        markdownCornerUnlinkedFromPanelPaddingRef.current =
          params.markdownCornerPaddingRightPx !== panelH ||
          params.markdownCornerPaddingBottomPx !== panelV;

        setMarginGutterPx(params.marginGutterPx);
        setHorizontalPaddingPx(params.horizontalPaddingPx);
        setPanelBorderRadiusPx(params.panelBorderRadiusPx);
        setPanelPaddingVerticalPx(params.panelPaddingVerticalPx);
        setPanelPaddingHorizontalPx(params.panelPaddingHorizontalPx);
        setMarkdownCornerPaddingRightPx(params.markdownCornerPaddingRightPx);
        setMarkdownCornerPaddingBottomPx(params.markdownCornerPaddingBottomPx);
        setDashboardBackgroundToken(params.dashboardBackgroundToken);
        setLightModePanelBackgroundToken(params.lightModePanelBackgroundToken);
        setDarkModePanelBackgroundToken(params.darkModePanelBackgroundToken);
        pane.refresh();
      };

      const presetUi = { preset: DASHBOARD_LAYOUT_TWEAKPANE_CURRENT_STATE_PRESET_ID };
      const presetOptions = presets.map((p) => ({ text: p.label, value: p.id }));

      pane
        .addBinding(presetUi, 'preset', {
          label: 'Presets',
          options: presetOptions,
        })
        .on('change', (ev) => {
          const nextId = typeof ev.value === 'string' ? ev.value : presetUi.preset;
          const match = presets.find((p) => p.id === nextId);
          if (match) {
            applyLayoutTweakValues(match.values);
          }
        });

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
          params.marginGutterPx = next;
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
          params.horizontalPaddingPx = next;
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
          params.panelBorderRadiusPx = next;
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
          const clamped = Math.min(30, Math.max(0, next));
          params.panelPaddingVerticalPx = clamped;
          setPanelPaddingVerticalPx(clamped);
          syncMarkdownCornerPaddingFromPanelPadding();
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
          const clamped = Math.min(30, Math.max(0, next));
          params.panelPaddingHorizontalPx = clamped;
          setPanelPaddingHorizontalPx(clamped);
          syncMarkdownCornerPaddingFromPanelPadding();
        });

      pane
        .addBinding(params, 'markdownCornerPaddingRightPx', {
          label: 'Markdown corner padding (right)',
          min: 0,
          max: DASHBOARD_MARKDOWN_CORNER_PADDING_MAX_PX,
          step: 1,
        })
        .on('change', (ev) => {
          markdownCornerUnlinkedFromPanelPaddingRef.current = true;
          const next = readNumber(ev.value) ?? params.markdownCornerPaddingRightPx;
          const clamped = Math.min(DASHBOARD_MARKDOWN_CORNER_PADDING_MAX_PX, Math.max(0, next));
          params.markdownCornerPaddingRightPx = clamped;
          setMarkdownCornerPaddingRightPx(clamped);
        });

      pane
        .addBinding(params, 'markdownCornerPaddingBottomPx', {
          label: 'Markdown corner padding (bottom)',
          min: 0,
          max: DASHBOARD_MARKDOWN_CORNER_PADDING_MAX_PX,
          step: 1,
        })
        .on('change', (ev) => {
          markdownCornerUnlinkedFromPanelPaddingRef.current = true;
          const next = readNumber(ev.value) ?? params.markdownCornerPaddingBottomPx;
          const clamped = Math.min(DASHBOARD_MARKDOWN_CORNER_PADDING_MAX_PX, Math.max(0, next));
          params.markdownCornerPaddingBottomPx = clamped;
          setMarkdownCornerPaddingBottomPx(clamped);
        });

      pane
        .addBinding(params, 'dashboardBackgroundToken', {
          label: 'Dashboard background',
          options:
            dashboardBgOptions.length > 0
              ? dashboardBgOptions
              : [{ text: 'Subdued', value: DASHBOARD_DEFAULT_BACKGROUND_TOKEN }],
        })
        .on('change', (ev) => {
          const next = typeof ev.value === 'string' ? ev.value : params.dashboardBackgroundToken;
          params.dashboardBackgroundToken = next;
          setDashboardBackgroundToken(next);
        });

      const panelBgListOptions =
        panelBgOptions.length > 0
          ? panelBgOptions
          : [{ text: 'Plain', value: DASHBOARD_DEFAULT_PANEL_BACKGROUND_TOKEN }];

      pane
        .addBinding(params, 'lightModePanelBackgroundToken', {
          label: 'Light mode panel BG',
          options: panelBgListOptions,
        })
        .on('change', (ev) => {
          const next =
            typeof ev.value === 'string' ? ev.value : params.lightModePanelBackgroundToken;
          params.lightModePanelBackgroundToken = next;
          setLightModePanelBackgroundToken(next);
        });

      pane
        .addBinding(params, 'darkModePanelBackgroundToken', {
          label: 'Dark mode panel BG',
          options: panelBgListOptions,
        })
        .on('change', (ev) => {
          const next =
            typeof ev.value === 'string' ? ev.value : params.darkModePanelBackgroundToken;
          params.darkModePanelBackgroundToken = next;
          setDarkModePanelBackgroundToken(next);
        });

      applyLayoutTweakValues(params);

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
    markdownCornerPaddingRightPx,
    markdownCornerPaddingBottomPx,
    dashboardBackgroundToken,
    lightModePanelBackgroundToken,
    darkModePanelBackgroundToken,
  };
}
