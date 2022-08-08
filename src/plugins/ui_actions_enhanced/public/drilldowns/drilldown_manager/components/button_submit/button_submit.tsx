/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { EuiButton } from '@elastic/eui';

export interface ButtonSubmitProps {
  disabled?: boolean;
  onClick: () => void;
}

export const ButtonSubmit: React.FC<ButtonSubmitProps> = ({ disabled, onClick, children }) => {
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
