/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButton, useEuiTheme } from '@elastic/eui';
import { EuiButtonPropsForButton } from '@elastic/eui/src/components/button/button';
import './button.scss';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

import './button.scss';

export interface Props
  extends Pick<EuiButtonPropsForButton, 'onClick' | 'iconType' | 'iconSide' | 'className'> {
  label: string;
  primary?: boolean;
  isDarkModeEnabled?: boolean;
}

const label = i18n.translate('sharedUX.solutionToolbarButton.solutionToolbarButtonLabel', {
  defaultMessage: 'sample label',
});

export const SolutionToolbarButton = ({ primary, className, ...rest }: Props) => {
  const { euiTheme } = useEuiTheme();
  const { colors, border, size } = euiTheme;
  const buttonCSS = css`
    line-height: ${size.base};
    background-color: ${colors.primary};
    border-color: ${border.color};
    border-width: ${border.width.thin};
    border-style: ${border.color};
    }
  `;

  return (
    <EuiButton
      {...rest}
      size="m"
      color={primary ? 'primary' : 'text'}
      className={`solutionToolbarButton ${className}`}
      fill={primary}
      css={buttonCSS}
    >
      {label}
    </EuiButton>
  );
};
