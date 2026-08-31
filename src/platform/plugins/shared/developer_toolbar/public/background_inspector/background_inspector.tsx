/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelect,
  EuiSpacer,
  EuiTextArea,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { framedAppearanceBackgrounds } from '@kbn/ui-chrome-layout';

const OVERRIDE_STYLE_ID = 'devToolbarBackgroundOverride';

const CHROME_SELECTOR = 'html';
const DASHBOARD_SHADE_10 = '#F6F9FC';
const APP_FRAME_SELECTOR = '.kbnChromeLayoutApplication:has(.dshDashboardViewportWrapper)';

type RecommendationId = 'default' | 'rec1' | 'rec2' | 'rec3';

const RECOMMENDATION_OPTIONS: Array<{ value: RecommendationId; text: string }> = [
  { value: 'default', text: 'Default · radial + linear gradients' },
  { value: 'rec1', text: 'Rec 1 · shade 15 + subtle divider' },
  { value: 'rec2', text: 'Rec 2 · shade 20 solid (recommended)' },
  { value: 'rec3', text: 'Rec 3 · shade 15 → shade 20 linear' },
];

const RECOMMENDATIONS: Record<
  Exclude<RecommendationId, 'default'>,
  { chrome: string; dashboard: string }
> = {
  rec1: {
    chrome: '#ECF1F9',
    dashboard: DASHBOARD_SHADE_10,
  },
  rec2: {
    chrome: '#E3E8F2',
    dashboard: DASHBOARD_SHADE_10,
  },
  rec3: {
    chrome: 'linear-gradient(#ECF1F9, #E3E8F2)',
    dashboard: DASHBOARD_SHADE_10,
  },
};

interface RememberedBackgroundSelection {
  isOverriding: boolean;
  recommendation: RecommendationId;
  chrome: string;
  dashboard: string;
}

/**
 * Survives the toolbar being minimized or hidden. A full page reload still
 * restores the defaults.
 */
let rememberedSelection: RememberedBackgroundSelection = {
  isOverriding: false,
  recommendation: 'default',
  chrome: '',
  dashboard: '',
};

/** Nodes that paint the fill behind dashboard panels. */
const DASHBOARD_WRITE_SELECTOR = [
  '.dshDashboardViewportWrapper',
  '.kbnChromeLayoutApplication:has(.dshDashboardViewportWrapper)',
].join(', ');

const SAMPLE_IGNORE_SELECTOR = [
  '.embPanel',
  '.kbnGridPanel',
  '.euiPopover',
  '.euiFlyout',
  '.euiHeader',
].join(', ');

const getPageColorMode = (): 'LIGHT' | 'DARK' => {
  const tag = (window as { __kbnThemeTag__?: string }).__kbnThemeTag__;
  return tag?.endsWith('dark') ? 'DARK' : 'LIGHT';
};

const applyOverrides = (cssText: string) => {
  let styleEl = document.getElementById(OVERRIDE_STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = OVERRIDE_STYLE_ID;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = cssText;
};

const removeOverrides = () => {
  document.getElementById(OVERRIDE_STYLE_ID)?.remove();
};

const toHexChannel = (value: string): string =>
  Number.parseInt(value, 10).toString(16).padStart(2, '0');

const cssColorToHex = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  const rgb = trimmed.match(
    /^rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)(?:\s*[,/]\s*([\d.]+)(%)?)?\s*\)$/i
  );
  if (!rgb) {
    return undefined;
  }

  const alpha = rgb[4] === undefined ? 1 : Number(rgb[4]) / (rgb[5] ? 100 : 1);
  if (alpha === 0) {
    return undefined;
  }

  return `#${toHexChannel(rgb[1])}${toHexChannel(rgb[2])}${toHexChannel(rgb[3])}`.toUpperCase();
};

const isUsableFill = (hex: string | undefined): hex is string => {
  if (!hex) {
    return false;
  }
  const normalized = hex.replace('#', '');
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized.slice(0, 6);
  return expanded.toUpperCase() !== 'FFFFFF';
};

const readElementFill = (element: Element | null): string | undefined => {
  if (!element) {
    return undefined;
  }
  return cssColorToHex(getComputedStyle(element).backgroundColor);
};

/**
 * Sample the color actually showing in the dashboard gutter, not a parent
 * token and not a white panel.
 */
const readDashboardBackground = (): string | undefined => {
  const viewport =
    document.querySelector('.kbnGrid') ??
    document.querySelector('[data-test-subj="dshDashboardViewport"]') ??
    document.querySelector('.dshDashboardViewportWrapper');

  if (viewport) {
    const rect = viewport.getBoundingClientRect();
    const sampleX = rect.left + Math.min(12, Math.max(rect.width / 2, 0));
    const sampleY = rect.top + Math.min(12, Math.max(rect.height / 2, 0));
    let node = document.elementFromPoint(sampleX, sampleY) as HTMLElement | null;

    while (node && node !== document.documentElement) {
      if (!node.closest(SAMPLE_IGNORE_SELECTOR)) {
        const hex = readElementFill(node);
        if (isUsableFill(hex)) {
          return hex;
        }
      }
      node = node.parentElement;
    }
  }

  for (const selector of [
    '.dshDashboardViewportWrapper',
    '.kbnGrid',
    '[data-test-subj="dshDashboardViewport"]',
  ]) {
    const hex = readElementFill(document.querySelector(selector));
    if (isUsableFill(hex)) {
      return hex;
    }
  }

  return undefined;
};

interface EditableFieldProps {
  label: string;
  helpText: React.ReactNode;
  value: string;
  rows: number;
  onChange: (value: string) => void;
}

const EditableField = ({ label, helpText, value, rows, onChange }: EditableFieldProps) => (
  <EuiFormRow
    label={label}
    helpText={helpText}
    fullWidth
    labelAppend={
      <EuiCopy textToCopy={value}>
        {(copy) => (
          <EuiButtonEmpty size="xs" iconType="copyClipboard" onClick={copy} flush="right">
            Copy
          </EuiButtonEmpty>
        )}
      </EuiCopy>
    }
  >
    <EuiTextArea
      fullWidth
      compressed
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      css={{ fontFamily: 'monospace', fontSize: '12px' }}
    />
  </EuiFormRow>
);

/**
 * Developer toolbar control to inspect and live-edit framed chrome and the
 * dashboard fill behind panels.
 */
export const BackgroundInspector = () => {
  const isDark = getPageColorMode() === 'DARK';

  const chromeDefault = isDark
    ? framedAppearanceBackgrounds.dark
    : framedAppearanceBackgrounds.light;

  const [isOpen, setIsOpen] = useState(false);
  const [isOverriding, setIsOverriding] = useState(rememberedSelection.isOverriding);
  const [chrome, setChrome] = useState(rememberedSelection.chrome || chromeDefault);
  const [dashboard, setDashboard] = useState(rememberedSelection.dashboard);
  const [recommendation, setRecommendation] = useState<RecommendationId>(
    rememberedSelection.recommendation
  );

  useEffect(() => {
    if (isOverriding) {
      return;
    }
    setChrome(chromeDefault);
    setDashboard(readDashboardBackground() ?? '');
  }, [chromeDefault, isOpen, isOverriding]);

  useEffect(() => {
    if (!isOverriding) {
      removeOverrides();
      return;
    }
    applyOverrides(`
      ${CHROME_SELECTOR} {
        background: ${chrome} !important;
        background-repeat: no-repeat !important;
      }
      ${DASHBOARD_WRITE_SELECTOR} {
        background-color: ${dashboard} !important;
      }
      ${
        recommendation === 'rec1'
          ? `${APP_FRAME_SELECTOR} { outline: 1px solid #D6DDEA !important; }`
          : ''
      }
    `);
  }, [isOverriding, chrome, dashboard, recommendation]);

  useEffect(() => {
    rememberedSelection = {
      isOverriding,
      recommendation,
      chrome,
      dashboard,
    };
  }, [isOverriding, recommendation, chrome, dashboard]);

  const edit = useCallback(
    (setter: (value: string) => void) => (value: string) => {
      setIsOverriding(true);
      setter(value);
    },
    []
  );

  const selectRecommendation = useCallback(
    (id: RecommendationId) => {
      setRecommendation(id);

      if (id === 'default') {
        setChrome(chromeDefault);
        setDashboard(readDashboardBackground() ?? DASHBOARD_SHADE_10);
        setIsOverriding(false);
        return;
      }

      const preset = RECOMMENDATIONS[id];
      setChrome(preset.chrome);
      setDashboard(preset.dashboard);
      setIsOverriding(true);
    },
    [chromeDefault]
  );

  const reset = useCallback(() => selectRecommendation('default'), [selectRecommendation]);

  const popoverTitleId = useGeneratedHtmlId({ prefix: 'devToolbarBackgrounds' });

  return (
    <EuiPopover
      aria-labelledby={popoverTitleId}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="upRight"
      panelPaddingSize="m"
      button={
        <EuiBadge
          iconType="brush"
          iconSide="left"
          color={isOverriding ? 'accent' : 'hollow'}
          onClick={() => setIsOpen((open) => !open)}
          onClickAriaLabel="Inspect and edit backgrounds"
        >
          {isOverriding ? 'Backgrounds (edited)' : 'Backgrounds'}
        </EuiBadge>
      }
    >
      <div css={{ width: 460, maxWidth: '90vw' }}>
        <EuiPopoverTitle id={popoverTitleId}>
          Chrome & dashboard backgrounds ({isDark ? 'dark' : 'light'})
        </EuiPopoverTitle>

        <EuiFormRow
          label="Chrome treatment"
          helpText="Switch between the current design and three light-mode recommendations."
          fullWidth
        >
          <EuiSelect
            compressed
            fullWidth
            options={RECOMMENDATION_OPTIONS}
            value={recommendation}
            onChange={(event) => selectRecommendation(event.target.value as RecommendationId)}
          />
        </EuiFormRow>

        <EuiSpacer size="s" />

        <EditableField
          label="Chrome background (framed appearance)"
          helpText={
            <>
              Applied to <code>html</code>. Source:{' '}
              <code>kbn-ui/chrome-layout/src/layouts/grid_global_app_style.tsx</code>
            </>
          }
          value={chrome}
          rows={7}
          onChange={edit(setChrome)}
        />

        <EuiHorizontalRule margin="s" />

        <EditableField
          label="Dashboard background"
          helpText="The fill behind the panels (the dark navy in the gutters). Not the white panel cards. Change this hex to try a new color."
          value={dashboard}
          rows={1}
          onChange={edit(setDashboard)}
        />

        <EuiSpacer size="m" />

        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" onClick={reset} isDisabled={!isOverriding}>
              Reset
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton size="s" fill onClick={() => setIsOpen(false)}>
              Done
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
};
