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

export interface Props extends Pick<EuiButtonPropsForButton, 'onClick' | 'iconType' | 'iconSide'> {
  label: string;
}

export const ToolbarButton = ({ label, iconSide = 'left', ...rest }: Props) => {
  return (
    <EuiButton size="m" color="primary" fill={true} {...{ iconSide, ...rest }}>
      {label}
    </EuiButton>
  );
};
