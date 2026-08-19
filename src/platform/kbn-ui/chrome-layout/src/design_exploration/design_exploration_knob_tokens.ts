/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DesignExplorationKnobTokens } from './design_exploration_knobs';
import { DESIGN_EXPLORATION_PADDING, DESIGN_EXPLORATION_PADDING_COMPACT } from './design_exploration_shared';
import { ATTBANA_VARIANT_ID } from './variant_attbana';
import { BASELINE_VARIANT_ID } from './variant_baseline';
import { INTERBANA_VARIANT_ID } from './variant_interbana';
import { LINBANA_VARIANT_ID } from './variant_linbana';
import { NIRBANA_VARIANT_ID } from './variant_nirbana';
import { TARGET_VARIANT_ID } from './variant_target';
import { VERBANA_VARIANT_ID } from './variant_verbana';

export const BASELINE_KNOB_TOKENS: DesignExplorationKnobTokens = {
  canvas: '#F7F8FC',
  surface: '#FFFFFF',
  surfaceNav: '#EFF2F7',
  padding: DESIGN_EXPLORATION_PADDING,
  gutter: DESIGN_EXPLORATION_PADDING,
  panelPadding: DESIGN_EXPLORATION_PADDING,
  radiusControl: 8,
  radiusButton: 8,
  radiusContainer: 12,
  radiusPanel: 10,
  radiusPanelCompact: 8,
  shellShadow: 'none',
};

export const VERBANA_KNOB_TOKENS: DesignExplorationKnobTokens = {
  canvas: '#ECEFF4',
  surface: '#FFFFFF',
  surfaceNav: '#F4F6FA',
  padding: DESIGN_EXPLORATION_PADDING,
  gutter: 12,
  panelPadding: DESIGN_EXPLORATION_PADDING_COMPACT,
  radiusControl: 8,
  radiusButton: 8,
  radiusContainer: 12,
  radiusPanel: 8,
  radiusPanelCompact: 8,
  shellShadow: '0px 1px 3px 0px rgba(20, 20, 20, 0.08)',
};

export const LINBANA_KNOB_TOKENS: DesignExplorationKnobTokens = {
  canvas: '#F3F4F8',
  surface: '#FAFAFC',
  surfaceNav: '#F3F4F8',
  padding: 20,
  gutter: 8,
  panelPadding: DESIGN_EXPLORATION_PADDING_COMPACT + 4,
  radiusControl: 8,
  radiusButton: 16,
  radiusContainer: 12,
  radiusPanel: 10,
  radiusPanelCompact: 8,
  shellShadow: 'none',
};

export const ATTBANA_KNOB_TOKENS: DesignExplorationKnobTokens = {
  ...LINBANA_KNOB_TOKENS,
  surfaceNav: LINBANA_KNOB_TOKENS.canvas,
};

export const INTERBANA_KNOB_TOKENS: DesignExplorationKnobTokens = {
  canvas: '#EBEEF4',
  surface: '#FFFFFF',
  surfaceNav: '#F8F9FB',
  padding: 24,
  gutter: 20,
  panelPadding: DESIGN_EXPLORATION_PADDING_COMPACT + 12,
  radiusControl: 8,
  radiusButton: 999,
  radiusContainer: 16,
  radiusPanel: 12,
  radiusPanelCompact: 12,
  shellShadow: '0px 1px 4px 0px rgba(20, 20, 20, 0.15)',
};

export const NIRBANA_KNOB_TOKENS: DesignExplorationKnobTokens = {
  ...INTERBANA_KNOB_TOKENS,
  canvas: '#EAEDF5',
};

export const TARGET_KNOB_TOKENS: DesignExplorationKnobTokens = {
  ...NIRBANA_KNOB_TOKENS,
  radiusButton: 8,
  radiusPanel: 12,
  radiusPanelCompact: 12,
};

export const DESIGN_EXPLORATION_KNOB_TOKENS_BY_VARIANT: Record<string, DesignExplorationKnobTokens> =
  {
    [BASELINE_VARIANT_ID]: BASELINE_KNOB_TOKENS,
    [VERBANA_VARIANT_ID]: VERBANA_KNOB_TOKENS,
    [LINBANA_VARIANT_ID]: LINBANA_KNOB_TOKENS,
    [ATTBANA_VARIANT_ID]: ATTBANA_KNOB_TOKENS,
    [INTERBANA_VARIANT_ID]: INTERBANA_KNOB_TOKENS,
    [NIRBANA_VARIANT_ID]: NIRBANA_KNOB_TOKENS,
    [TARGET_VARIANT_ID]: TARGET_KNOB_TOKENS,
  };

export const getDesignExplorationKnobTokens = (variantId: string): DesignExplorationKnobTokens =>
  DESIGN_EXPLORATION_KNOB_TOKENS_BY_VARIANT[variantId] ?? BASELINE_KNOB_TOKENS;
