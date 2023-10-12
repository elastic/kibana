/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButton, EuiFieldText, EuiSpacer } from '@elastic/eui';

export interface DemoProps {
  fieldDisabled: boolean;
  buttonDisabled: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClick: () => void;
}

export const Demo = ({ fieldDisabled, buttonDisabled, onChange, onClick }: DemoProps) => {
  return (
    <>
      <EuiFieldText disabled={fieldDisabled} onChange={onChange} aria-label={'Text field'} />

      <EuiSpacer />

      <EuiButton fill onClick={onClick} disabled={buttonDisabled}>
        Click me
      </EuiButton>
    </>
  );
};
