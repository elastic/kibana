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

  return css`
    ${scope} {
      ${layoutVarName('application.marginRight')}: 0px !important;
    }

    ${scope} [data-test-subj='kbnGridLayout'] {
      --kbnGridGutterSize: 12 !important;
      padding: ${DESIGN_EXPLORATION_PADDING}px !important;
    }

    ${scope} [data-test-subj='embeddablePanel'] {
      border-radius: ${DESIGN_EXPLORATION_RADIUS_CONTROL}px !important;
      border: ${DESIGN_EXPLORATION_BORDER_WIDTH}px solid ${colors.borderBaseSubdued} !important;
      box-shadow: none !important;
    }

    ${scope} [data-test-subj='globalQueryBar'] {
      padding: ${DESIGN_EXPLORATION_PADDING_COMPACT}px !important;
      padding-bottom: ${DESIGN_EXPLORATION_GAP}px !important;
    }

    ${scope} .kbnChromeLayoutApplication:has([data-test-subj='appHeader']) {
      --kbn-application--top-bar-height: ${DESIGN_EXPLORATION_TOP_BAR_HEIGHT}px !important;
    }

    ${scope} .kbnChromeLayoutApplication div:has(> [data-test-subj='appHeader']) [data-test-subj='appHeader'] {
      border-radius: 0 !important;
      border-block-end: ${DESIGN_EXPLORATION_BORDER_WIDTH}px solid ${colors.borderBaseSubdued} !important;
      box-shadow: none !important;
      background-color: ${colors.backgroundBasePlain} !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }

    ${scope} .kbnChromeLayoutApplication div:has(> [data-test-subj='appHeader']) {
      width: 100% !important;
      margin: 0 !important;
      min-height: 48px !important;
    }

    ${scope} .kbnChromeLayoutApplication {
      background-color: transparent !important;
      box-shadow: none !important;
    }

    ${scope} .kbnChromeLayoutApplication div:has(> #dashboardTitle) {
      top: ${DESIGN_EXPLORATION_TOP_BAR_HEIGHT}px !important;
      width: 100% !important;
      background-color: ${colors.backgroundBasePlain} !important;
      border-block-end: ${DESIGN_EXPLORATION_BORDER_WIDTH}px solid ${colors.borderBaseSubdued} !important;
      box-shadow: none !important;
      margin-inline: 0 !important;
    }

    ${scope} .dshDashboardViewportWrapper,
    ${scope} .dshDashboardViewportWrapper--defaultBg {
      background-color: transparent !important;
    }

    ${scope} .kbnChromeLayoutNavigation {
      border-inline-end: ${DESIGN_EXPLORATION_BORDER_WIDTH}px solid ${colors.borderBaseSubdued} !important;
    }

    ${scope} .kbnChromeLayoutHeader {
      border-block-end: ${DESIGN_EXPLORATION_BORDER_WIDTH}px solid ${colors.borderBaseSubdued} !important;
    }
  `;
};
