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
import { BASELINE_VARIANT_ID, createBaselineStyles } from './variant_baseline';
import { VERBANA_VARIANT_ID, createVerbanaStyles } from './variant_verbana';

export interface DesignExplorationVariantDefinition {
  id: string;
  label: string;
  createStyles: (euiTheme: UseEuiTheme) => SerializedStyles;
}

export const DESIGN_EXPLORATION_VARIANTS: DesignExplorationVariantDefinition[] = [
  {
    id: VERBANA_VARIANT_ID,
    label: 'Verbana',
    createStyles: createVerbanaStyles,
  },
  {
    id: BASELINE_VARIANT_ID,
    label: 'Baseline',
    createStyles: createBaselineStyles,
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

export { isDesignExplorationVariantId };
