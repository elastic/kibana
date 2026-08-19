/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import type { SerializedStyles } from '@emotion/react';
import {
  DEFAULT_DESIGN_EXPLORATION_VARIANT_ID,
  getDesignExplorationVariant,
  isDesignExplorationVariantId,
} from '@kbn/core-chrome-feature-flags';
import type { DesignExplorationKnobId, DesignExplorationKnobTokens } from './design_exploration_knobs';
import {
  ATTBANA_KNOB_TOKENS,
  BASELINE_KNOB_TOKENS,
  INTERBANA_KNOB_TOKENS,
  LINBANA_KNOB_TOKENS,
  NIRBANA_KNOB_TOKENS,
  TARGET_KNOB_TOKENS,
  VERBANA_KNOB_TOKENS,
  getDesignExplorationKnobTokens,
} from './design_exploration_knob_tokens';
import { BASELINE_VARIANT_ID, createBaselineStyles } from './variant_baseline';
import { ATTBANA_VARIANT_ID, createAttbanaStyles } from './variant_attbana';
import { INTERBANA_VARIANT_ID, createInterbanaStyles } from './variant_interbana';
import { LINBANA_VARIANT_ID, createLinbanaStyles } from './variant_linbana';
import { NIRBANA_VARIANT_ID, createNirbanaStyles } from './variant_nirbana';
import { TARGET_VARIANT_ID, createTargetStyles } from './variant_target';
import { VERBANA_VARIANT_ID, createVerbanaStyles } from './variant_verbana';

export interface DesignExplorationVariantDefinition {
  id: string;
  label: string;
  knobTokens: DesignExplorationKnobTokens;
  /** Knobs hidden in the dev toolbar panel for variants that do not consume them. */
  disabledKnobIds?: DesignExplorationKnobId[];
  createStyles: (euiTheme: UseEuiTheme) => SerializedStyles;
}

export const DESIGN_EXPLORATION_VARIANTS: DesignExplorationVariantDefinition[] = [
  {
    id: BASELINE_VARIANT_ID,
    label: 'Baseline',
    knobTokens: BASELINE_KNOB_TOKENS,
    createStyles: createBaselineStyles,
  },
  {
    id: VERBANA_VARIANT_ID,
    label: 'Verbana',
    knobTokens: VERBANA_KNOB_TOKENS,
    disabledKnobIds: ['surfaceContrast'],
    createStyles: createVerbanaStyles,
  },
  {
    id: LINBANA_VARIANT_ID,
    label: 'Linbana',
    knobTokens: LINBANA_KNOB_TOKENS,
    createStyles: createLinbanaStyles,
  },
  {
    id: ATTBANA_VARIANT_ID,
    label: 'Attbana',
    knobTokens: ATTBANA_KNOB_TOKENS,
    createStyles: createAttbanaStyles,
  },
  {
    id: INTERBANA_VARIANT_ID,
    label: 'Interbana',
    knobTokens: INTERBANA_KNOB_TOKENS,
    createStyles: createInterbanaStyles,
  },
  {
    id: NIRBANA_VARIANT_ID,
    label: 'Nirbana',
    knobTokens: NIRBANA_KNOB_TOKENS,
    createStyles: createNirbanaStyles,
  },
  {
    id: TARGET_VARIANT_ID,
    label: 'Target',
    knobTokens: TARGET_KNOB_TOKENS,
    createStyles: createTargetStyles,
  },
];

export const getDefaultDesignExplorationVariantId = () => DEFAULT_DESIGN_EXPLORATION_VARIANT_ID;

export const getDesignExplorationVariantById = (
  variantId: string
): DesignExplorationVariantDefinition => {
  const variant = DESIGN_EXPLORATION_VARIANTS.find(({ id }) => id === variantId);
  if (variant) {
    return variant;
  }

  return DESIGN_EXPLORATION_VARIANTS.find(({ id }) => id === DEFAULT_DESIGN_EXPLORATION_VARIANT_ID)!;
};

export const getActiveDesignExplorationVariant = (): DesignExplorationVariantDefinition => {
  const variantId = getDesignExplorationVariant();
  return getDesignExplorationVariantById(variantId);
};

export const createActiveDesignExplorationStyles = (euiTheme: UseEuiTheme) => {
  return getActiveDesignExplorationVariant().createStyles(euiTheme);
};

export { getDesignExplorationKnobTokens, isDesignExplorationVariantId };
