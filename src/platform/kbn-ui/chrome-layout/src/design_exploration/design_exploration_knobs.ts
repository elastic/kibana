/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ColorMode } from '@elastic/eui';
import {
  resolveDesignExplorationBespokeCssVars,
  resolveDesignExplorationKnobTokensForColorMode,
} from './design_exploration_bespoke_colors';

export const DESIGN_EXPLORATION_KNOBS_SESSION_KEY = 'dev.core.chrome.designExploration.knobs';

export const DESIGN_EXPLORATION_KNOBS_CHANGED_EVENT = 'design-exploration-knobs-changed';

/** Midpoint (50) applies each variant's base token values unchanged. */
export const DESIGN_EXPLORATION_KNOB_DEFAULT = 50;

export const DESIGN_EXPLORATION_STEPPED_KNOB_IDS = ['density', 'gutter', 'roundness'] as const;

export type DesignExplorationSteppedKnobId = (typeof DESIGN_EXPLORATION_STEPPED_KNOB_IDS)[number];

/** Three-position stepped knobs with default in the middle. */
export const DESIGN_EXPLORATION_STEPPED_KNOB_VALUES = [0, 50, 100] as const;

export const DESIGN_EXPLORATION_STEP_MULTIPLIERS = [0.875, 1, 1.125] as const;

/** Density is inverse of spacing — less density = more padding, more density = less padding. */
export const DESIGN_EXPLORATION_DENSITY_STEP_MULTIPLIERS = [1.125, 1, 0.875] as const;

/** Wider gutter swing than density/roundness — base (50) unchanged. Less/More: 0.8× / 1.2× (e.g. 16 / 20 / 24 at base 20). */
export const DESIGN_EXPLORATION_GUTTER_STEP_MULTIPLIERS = [0.8, 1, 1.2] as const;

export const DESIGN_EXPLORATION_KNOB_IDS = [
  'surfaceContrast',
  'density',
  'gutter',
  'roundness',
  'shellShadow',
] as const;

export type DesignExplorationKnobId = (typeof DESIGN_EXPLORATION_KNOB_IDS)[number];

export type DesignExplorationKnobValues = Record<DesignExplorationKnobId, number>;

export interface DesignExplorationKnobDefinition {
  id: DesignExplorationKnobId;
  label: string;
  min: number;
  max: number;
  step: number;
  ticks?: Array<{ label: string; value: number }>;
}

export const DESIGN_EXPLORATION_KNOB_DEFINITIONS: DesignExplorationKnobDefinition[] = [
  { id: 'surfaceContrast', label: 'Surface contrast', min: 0, max: 100, step: 1 },
  {
    id: 'density',
    label: 'Density',
    min: 0,
    max: 100,
    step: 50,
    ticks: [
      { label: 'Less', value: 0 },
      { label: 'Base', value: 50 },
      { label: 'More', value: 100 },
    ],
  },
  {
    id: 'gutter',
    label: 'Gutter',
    min: 0,
    max: 100,
    step: 50,
    ticks: [
      { label: 'Less', value: 0 },
      { label: 'Base', value: 50 },
      { label: 'More', value: 100 },
    ],
  },
  {
    id: 'roundness',
    label: 'Roundness',
    min: 0,
    max: 100,
    step: 50,
    ticks: [
      { label: 'Less', value: 0 },
      { label: 'Base', value: 50 },
      { label: 'More', value: 100 },
    ],
  },
  { id: 'shellShadow', label: 'Shell shadow', min: 0, max: 100, step: 1 },
];

export const getDesignExplorationKnobDefinitions = (
  disabledKnobIds: DesignExplorationKnobId[] = []
): DesignExplorationKnobDefinition[] =>
  DESIGN_EXPLORATION_KNOB_DEFINITIONS.filter(({ id }) => !disabledKnobIds.includes(id));

/** Base visual tokens for a variant before knob scaling (knob = 50). */
export interface DesignExplorationKnobTokens {
  canvas: string;
  surface: string;
  surfaceNav: string;
  padding: number;
  gutter: number;
  panelPadding: number;
  radiusControl: number;
  radiusButton: number;
  radiusContainer: number;
  radiusPanel: number;
  radiusPanelCompact: number;
  shellShadow: string;
}

export const DESIGN_EXPLORATION_KNOB_CSS_VAR_NAMES = {
  canvas: '--design-exploration-canvas',
  surface: '--design-exploration-surface',
  surfaceNav: '--design-exploration-surface-nav',
  padding: '--design-exploration-padding',
  /** Unitless — consumed by `--kbnGridGutterSize` (grid multiplies by 1px itself). */
  gridGutter: '--design-exploration-grid-gutter',
  panelPadding: '--design-exploration-panel-padding',
  radiusControl: '--design-exploration-radius-control',
  radiusButton: '--design-exploration-radius-button',
  radiusContainer: '--design-exploration-radius-container',
  radiusPanel: '--design-exploration-radius-panel',
  radiusPanelCompact: '--design-exploration-radius-panel-compact',
  shellShadow: '--design-exploration-shell-shadow',
} as const;

export type DesignExplorationKnobCssVar = keyof typeof DESIGN_EXPLORATION_KNOB_CSS_VAR_NAMES;

export const designExplorationKnobVar = (token: DesignExplorationKnobCssVar) =>
  `var(${DESIGN_EXPLORATION_KNOB_CSS_VAR_NAMES[token]})`;

export const createDefaultDesignExplorationKnobValues = (): DesignExplorationKnobValues => ({
  surfaceContrast: DESIGN_EXPLORATION_KNOB_DEFAULT,
  density: DESIGN_EXPLORATION_KNOB_DEFAULT,
  gutter: DESIGN_EXPLORATION_KNOB_DEFAULT,
  roundness: DESIGN_EXPLORATION_KNOB_DEFAULT,
  shellShadow: DESIGN_EXPLORATION_KNOB_DEFAULT,
});

type StoredKnobOverrides = Partial<Record<string, Partial<DesignExplorationKnobValues>>>;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const isSteppedKnob = (knobId: DesignExplorationKnobId): knobId is DesignExplorationSteppedKnobId =>
  DESIGN_EXPLORATION_STEPPED_KNOB_IDS.includes(knobId as DesignExplorationSteppedKnobId);

export const snapDesignExplorationKnobValue = (
  knobId: DesignExplorationKnobId,
  value: number
): number => {
  const definition = DESIGN_EXPLORATION_KNOB_DEFINITIONS.find(({ id }) => id === knobId);

  if (!definition) {
    return value;
  }

  const clamped = clamp(value, definition.min, definition.max);

  if (!isSteppedKnob(knobId)) {
    return clamped;
  }

  return DESIGN_EXPLORATION_STEPPED_KNOB_VALUES.reduce((closest, step) =>
    Math.abs(step - clamped) < Math.abs(closest - clamped) ? step : closest
  );
};

const steppedKnobMultiplier = (knobId: DesignExplorationSteppedKnobId, knobValue: number) => {
  const snapped = snapDesignExplorationKnobValue(knobId, knobValue);
  const index = DESIGN_EXPLORATION_STEPPED_KNOB_VALUES.indexOf(
    snapped as (typeof DESIGN_EXPLORATION_STEPPED_KNOB_VALUES)[number]
  );

  const multipliers =
    knobId === 'density'
      ? DESIGN_EXPLORATION_DENSITY_STEP_MULTIPLIERS
      : knobId === 'gutter'
      ? DESIGN_EXPLORATION_GUTTER_STEP_MULTIPLIERS
      : DESIGN_EXPLORATION_STEP_MULTIPLIERS;

  return multipliers[index >= 0 ? index : 1] ?? 1;
};

const scalePx = (value: number, multiplier: number) => `${Math.round(value * multiplier)}px`;

const scaleUnitless = (value: number, multiplier: number) =>
  `${Math.round(value * multiplier)}`;

const parseHexColor = (color: string): [number, number, number] | undefined => {
  const normalized = color.trim();
  const match = /^#([0-9a-f]{6})$/i.exec(normalized);
  if (!match) {
    return undefined;
  }

  const hex = match[1];
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
};

const toHexColor = ([red, green, blue]: [number, number, number]) =>
  `#${[red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`;

const mixHexColors = (from: string, to: string, amount: number) => {
  const fromRgb = parseHexColor(from);
  const toRgb = parseHexColor(to);

  if (!fromRgb || !toRgb) {
    return to;
  }

  const ratio = clamp(amount, 0, 1);
  return toHexColor(
    fromRgb.map((fromChannel, index) =>
      Math.round(fromChannel + (toRgb[index]! - fromChannel) * ratio)
    ) as [number, number, number]
  );
};

const resolveCanvasColor = (
  tokens: DesignExplorationKnobTokens,
  surfaceContrast: number
): string => {
  const knob = clamp(surfaceContrast, 0, 100);

  if (knob <= DESIGN_EXPLORATION_KNOB_DEFAULT) {
    const amount = knob / DESIGN_EXPLORATION_KNOB_DEFAULT;
    return mixHexColors(tokens.surface, tokens.canvas, amount);
  }

  const amount = (knob - DESIGN_EXPLORATION_KNOB_DEFAULT) / DESIGN_EXPLORATION_KNOB_DEFAULT;
  const darkened = mixHexColors(tokens.canvas, '#000000', amount * 0.12);
  return darkened;
};

const resolveShellShadow = (tokens: DesignExplorationKnobTokens, shellShadow: number) => {
  const knob = clamp(shellShadow, 0, 100);

  if (knob === 0) {
    return 'none';
  }

  if (knob === DESIGN_EXPLORATION_KNOB_DEFAULT) {
    return tokens.shellShadow;
  }

  const match = /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/.exec(
    tokens.shellShadow
  );

  if (!match) {
    return tokens.shellShadow;
  }

  const [, red, green, blue, alpha] = match;
  const baseAlpha = Number(alpha);
  const scaledAlpha =
    knob < DESIGN_EXPLORATION_KNOB_DEFAULT
      ? baseAlpha * (knob / DESIGN_EXPLORATION_KNOB_DEFAULT)
      : baseAlpha + ((knob - DESIGN_EXPLORATION_KNOB_DEFAULT) / DESIGN_EXPLORATION_KNOB_DEFAULT) * baseAlpha;

  return `0px 1px 4px 0px rgba(${red}, ${green}, ${blue}, ${scaledAlpha.toFixed(3)})`;
};

const readStoredKnobOverrides = (): StoredKnobOverrides => {
  try {
    const stored = sessionStorage.getItem(DESIGN_EXPLORATION_KNOBS_SESSION_KEY);
    if (!stored) {
      return {};
    }

    return JSON.parse(stored) as StoredKnobOverrides;
  } catch {
    return {};
  }
};

const writeStoredKnobOverrides = (overrides: StoredKnobOverrides) => {
  sessionStorage.setItem(DESIGN_EXPLORATION_KNOBS_SESSION_KEY, JSON.stringify(overrides));
};

export const getDesignExplorationKnobValues = (
  variantId: string
): DesignExplorationKnobValues => {
  const defaults = createDefaultDesignExplorationKnobValues();
  const stored = readStoredKnobOverrides()[variantId];

  if (!stored) {
    return defaults;
  }

  return {
    ...defaults,
    ...Object.fromEntries(
      DESIGN_EXPLORATION_KNOB_IDS.map((knobId) => [
        knobId,
        snapDesignExplorationKnobValue(
          knobId,
          stored[knobId] ?? defaults[knobId]
        ),
      ])
    ),
  };
};

export const setDesignExplorationKnobValue = (
  variantId: string,
  knobId: DesignExplorationKnobId,
  value: number
) => {
  const stored = readStoredKnobOverrides();
  const variantOverrides = stored[variantId] ?? {};
  const definition = DESIGN_EXPLORATION_KNOB_DEFINITIONS.find(({ id }) => id === knobId);

  if (!definition) {
    return;
  }

  stored[variantId] = {
    ...variantOverrides,
    [knobId]: snapDesignExplorationKnobValue(knobId, value),
  };

  writeStoredKnobOverrides(stored);
};

export const resetDesignExplorationKnobValues = (variantId: string) => {
  const stored = readStoredKnobOverrides();
  delete stored[variantId];
  writeStoredKnobOverrides(stored);
};

export const resolveDesignExplorationKnobCssVars = (
  tokens: DesignExplorationKnobTokens,
  knobValues: DesignExplorationKnobValues
): Record<string, string> => {
  const { surfaceContrast, density, gutter, roundness, shellShadow } = knobValues;

  return {
    [DESIGN_EXPLORATION_KNOB_CSS_VAR_NAMES.canvas]: resolveCanvasColor(tokens, surfaceContrast),
    [DESIGN_EXPLORATION_KNOB_CSS_VAR_NAMES.surface]: tokens.surface,
    [DESIGN_EXPLORATION_KNOB_CSS_VAR_NAMES.surfaceNav]: tokens.surfaceNav,
    [DESIGN_EXPLORATION_KNOB_CSS_VAR_NAMES.padding]: scalePx(
      tokens.padding,
      steppedKnobMultiplier('density', density)
    ),
    [DESIGN_EXPLORATION_KNOB_CSS_VAR_NAMES.gridGutter]: scaleUnitless(
      tokens.gutter,
      steppedKnobMultiplier('gutter', gutter)
    ),
    [DESIGN_EXPLORATION_KNOB_CSS_VAR_NAMES.panelPadding]: scalePx(
      tokens.panelPadding,
      steppedKnobMultiplier('density', density)
    ),
    [DESIGN_EXPLORATION_KNOB_CSS_VAR_NAMES.radiusControl]: scalePx(
      tokens.radiusControl,
      steppedKnobMultiplier('roundness', roundness)
    ),
    [DESIGN_EXPLORATION_KNOB_CSS_VAR_NAMES.radiusButton]: scalePx(
      tokens.radiusButton,
      steppedKnobMultiplier('roundness', roundness)
    ),
    [DESIGN_EXPLORATION_KNOB_CSS_VAR_NAMES.radiusContainer]: scalePx(
      tokens.radiusContainer,
      steppedKnobMultiplier('roundness', roundness)
    ),
    [DESIGN_EXPLORATION_KNOB_CSS_VAR_NAMES.radiusPanel]: scalePx(
      tokens.radiusPanel,
      steppedKnobMultiplier('roundness', roundness)
    ),
    [DESIGN_EXPLORATION_KNOB_CSS_VAR_NAMES.radiusPanelCompact]: scalePx(
      tokens.radiusPanelCompact,
      steppedKnobMultiplier('roundness', roundness)
    ),
    [DESIGN_EXPLORATION_KNOB_CSS_VAR_NAMES.shellShadow]: resolveShellShadow(tokens, shellShadow),
  };
};

export const applyDesignExplorationKnobCssVars = (
  tokens: DesignExplorationKnobTokens,
  variantId: string,
  colorMode: ColorMode
) => {
  const resolvedTokens = resolveDesignExplorationKnobTokensForColorMode(tokens, variantId, colorMode);
  const cssVars = {
    ...resolveDesignExplorationKnobCssVars(
      resolvedTokens,
      getDesignExplorationKnobValues(variantId)
    ),
    ...resolveDesignExplorationBespokeCssVars(variantId, colorMode),
  };

  Object.entries(cssVars).forEach(([name, value]) => {
    document.documentElement.style.setProperty(name, value);
  });
};

export const notifyDesignExplorationKnobsChanged = () => {
  window.dispatchEvent(new CustomEvent(DESIGN_EXPLORATION_KNOBS_CHANGED_EVENT));
};
