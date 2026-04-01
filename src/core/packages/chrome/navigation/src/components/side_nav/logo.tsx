/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { HTMLAttributes } from 'react';
import { EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import type { SideNavLogo } from '../../../types';
import { MenuItem } from '../menu_item';
import { NAVIGATION_SELECTOR_PREFIX } from '../../constants';
import { useTooltip } from '../../hooks/use_tooltip';

export interface LogoProps extends Omit<HTMLAttributes<HTMLAnchorElement>, 'onClick'>, SideNavLogo {
  id: string;
  isCollapsed: boolean;
  isCurrent?: boolean;
  isHighlighted: boolean;
  onClick?: () => void;
}

export const Logo = ({
  isCollapsed,
  isCurrent,
  isHighlighted,
  hideLabel,
  label,
  ...props
}: LogoProps): JSX.Element => {
  const { euiTheme } = useEuiTheme();
  const { tooltipRef, handleMouseOut } = useTooltip();

  const wrapperStyles = css`
    position: relative;
    padding-top: ${isCollapsed ? euiTheme.size.s : euiTheme.size.m};

    .euiText {
      font-weight: ${euiTheme.font.weight.bold};
    }

    svg {
      height: 20px;
      width: 20px;
    }
  `;

  const logoWrapperTestSubj = `${NAVIGATION_SELECTOR_PREFIX}-logoWrapper`;
  const logoTestSubj = `${NAVIGATION_SELECTOR_PREFIX}-logo`;

  const menuItem = (
    <div data-test-subj={logoWrapperTestSubj} css={wrapperStyles}>
      <MenuItem
        aria-label={i18n.translate('core.ui.chrome.sideNavigation.logoAriaLabel', {
          defaultMessage: '{label} homepage',
          values: { label },
        })}
        data-test-subj={logoTestSubj}
        isHighlighted={isHighlighted}
        isCurrent={isCurrent}
        isLabelVisible={!isCollapsed && !hideLabel}
        isTruncated={false}
        {...props}
      >
        {label}
      </MenuItem>
    </div>
  );

  if (isCollapsed) {
    return (
      <EuiToolTip
        ref={tooltipRef}
        content={label}
        disableScreenReaderOutput
        onMouseOut={handleMouseOut}
        position="right"
        repositionOnScroll
      >
        {menuItem}
      </EuiToolTip>
    );
  }

  return menuItem;
};
