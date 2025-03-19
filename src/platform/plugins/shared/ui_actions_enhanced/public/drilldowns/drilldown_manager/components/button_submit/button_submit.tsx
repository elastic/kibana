/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, PropsWithChildren } from 'react';
import { EuiButton } from '@elastic/eui';

export interface ButtonSubmitProps {
  disabled?: boolean;
  onClick: () => void;
}

export const ButtonSubmit: FC<PropsWithChildren<ButtonSubmitProps>> = ({
  disabled,
  onClick,
  children,
}) => {
  return (
    <EuiButton
      fill
      isDisabled={disabled}
      data-test-subj={'drilldownWizardSubmit'}
      onClick={onClick}
    >
      {children}
    </EuiButton>
  );
};
