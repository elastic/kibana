/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { FC } from 'react';
import { EuiButton, EuiFieldText, EuiForm, EuiFormRow, EuiSpacer, EuiSwitch } from '@elastic/eui';

export interface FormState {
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
  [key: string]: unknown;
}

interface Props {
  onSubmit: () => void;
  onChange: (form: FormState) => void;
  form: FormState;
}

export const Form: FC<Props> = ({ form, onChange, onSubmit }) => {
  return (
    <EuiForm
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <EuiFormRow label="First name">
        <EuiFieldText
          name="first"
          value={form.firstName}
          onChange={(e) => {
            onChange({ ...form, firstName: e.target.value });
          }}
        />
      </EuiFormRow>

      <EuiFormRow label="Last name">
        <EuiFieldText
          name="last"
          value={form.lastName}
          onChange={(e) => {
            onChange({ ...form, lastName: e.target.value });
          }}
        />
      </EuiFormRow>

      <EuiSpacer />

      <EuiFormRow>
        <EuiSwitch
          name="terms"
          label="Accept terms"
          checked={form.acceptTerms}
          onChange={(e) => {
            onChange({ ...form, acceptTerms: e.target.checked });
          }}
        />
      </EuiFormRow>

      <EuiSpacer />

      <EuiButton type="submit" fill>
        Save form
      </EuiButton>
    </EuiForm>
  );
};
