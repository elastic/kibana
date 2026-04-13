/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css, type SerializedStyles } from '@emotion/react';

import { NAVIGATION_SELECTOR_PREFIX } from '../../constants';

/** Matches project header vertical rules and logo-rail divider width. */
export const SIDE_NAV_RAIL_RULE_WIDTH_PX = 24;

export interface SideNavRailRuleProps {
  'data-test-subj'?: string;
  wrapperCss?: SerializedStyles | SerializedStyles[];
  ruleCss?: SerializedStyles | SerializedStyles[];
}

/**
 * Centered horizontal rule for the side-nav rail: full-width flex wrapper + fixed-width line
 * (same DOM pattern as the top-of-nav rail divider).
 */
export const SideNavRailRule = ({
  'data-test-subj': dataTestSubj,
  wrapperCss,
  ruleCss,
}: SideNavRailRuleProps) => {
  const { euiTheme, highContrastMode } = useEuiTheme();
  const { border, colors } = euiTheme;

  const wrapperStyles = css`
    box-sizing: border-box;
    display: flex;
    flex-shrink: 0;
    justify-content: center;
    inline-size: 100%;
  `;

  const ruleBaseStyles = highContrastMode
    ? css`
        box-sizing: border-box;
        flex-shrink: 0;
        inline-size: ${SIDE_NAV_RAIL_RULE_WIDTH_PX}px;
        border-block-start: ${border.width.thin} solid ${border.color};
        block-size: 0;
      `
    : css`
        box-sizing: border-box;
        flex-shrink: 0;
        inline-size: ${SIDE_NAV_RAIL_RULE_WIDTH_PX}px;
        block-size: ${border.width.thin};
        background-color: ${colors.borderBaseSubdued};
      `;

  return (
    <div css={[wrapperStyles, wrapperCss]}>
      <div
        aria-hidden={true}
        data-test-subj={dataTestSubj ?? `${NAVIGATION_SELECTOR_PREFIX}-railRule`}
        css={[ruleBaseStyles, ruleCss]}
      />
    </div>
  );
};
