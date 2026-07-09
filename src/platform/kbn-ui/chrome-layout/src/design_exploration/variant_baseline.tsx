/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';
import { layoutVarName } from '@kbn/ui-chrome-layout-constants';
import {
  DESIGN_EXPLORATION_BORDER_WIDTH,
  DESIGN_EXPLORATION_GAP,
  DESIGN_EXPLORATION_PADDING,
  DESIGN_EXPLORATION_PADDING_COMPACT,
  DESIGN_EXPLORATION_RADIUS_CONTROL,
  DESIGN_EXPLORATION_TOP_BAR_HEIGHT,
  designExplorationVariantScope,
} from './design_exploration_shared';

export const BASELINE_VARIANT_ID = 'baseline';

/** Flat panels and standard chrome — stub direction to validate variant switching. */
export const createBaselineStyles = (euiTheme: UseEuiTheme) => {
  const scope = designExplorationVariantScope(BASELINE_VARIANT_ID);
  const { colors } = euiTheme.euiTheme;

  return css``;
};
