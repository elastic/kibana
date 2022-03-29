/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { EuiButtonPropsForButton } from '@elastic/eui/src/components/button/button';
import { ButtonContentIconSide } from '@elastic/eui/src/components/button/button_content';

export interface Props extends Pick<EuiButtonPropsForButton, 'onClick' | 'iconType'> {
  label: string;
  iconSide?: ButtonContentIconSide;
}

export const ToolbarButton = ({ label, iconSide = 'left', ...rest }: Props) => {
  return (
    <EuiButton size="m" color="primary" fill={true} iconSide={iconSide} {...rest}>
      {label}
    </EuiButton>
  );
};
