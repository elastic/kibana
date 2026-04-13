/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

import { NAVIGATION_SELECTOR_PREFIX } from '../../constants';
import { SideNavRailRule } from './rail_rule';

export interface SideNavTopRailRuleProps {
  /**
   * When the logo/home row renders below the rule, add 8px under the line before the logo.
   * When the logo is hidden in the rail (e.g. Security `sideNavStatus: 'hidden'`), set false so
   * the rule is only separated from the primary menu by the nav column gap (avoids +8px vs other solutions).
   */
  withGapBeforeLogo: boolean;
}

export const SideNavTopRailRule = ({ withGapBeforeLogo }: SideNavTopRailRuleProps) => {
  const { euiTheme } = useEuiTheme();

  const ruleGapCss = withGapBeforeLogo
    ? css`
        margin-block-end: ${euiTheme.size.s};
      `
    : undefined;

  return (
    <SideNavRailRule
      data-test-subj={`${NAVIGATION_SELECTOR_PREFIX}-topRailRule`}
      ruleCss={ruleGapCss}
    />
  );
};
