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

import { ToolbarButtonStyles } from './toolbar_button.styles';

type ToolbarButtonTypes = 'primary' | 'empty';

/**
 * Props for `PrimaryButton`.
 */
export interface Props
  extends Pick<EuiButtonPropsForButton, 'onClick' | 'iconType' | 'iconSide' | 'data-test-subj'> {
  label: string;
  type?: ToolbarButtonTypes;
}

export const ToolbarButton: React.FunctionComponent<Props> = ({
  label,
  type = 'empty',
  iconSide = 'left',
  ...rest
}) => {
  const euiTheme = useEuiTheme();
  const toolbarButtonStyleProps: EuiButtonPropsForButton =
    type === 'primary'
      ? { color: 'primary', fill: true }
      : { color: 'text', css: ToolbarButtonStyles(euiTheme).emptyButton };

  return (
    <EuiButton size="m" {...toolbarButtonStyleProps} {...{ iconSide, ...rest }}>
      {label}
    </EuiButton>
  );
};
