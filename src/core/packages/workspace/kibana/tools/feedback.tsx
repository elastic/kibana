/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import React from 'react';

export const FeedbackTool = () => {
  return (
    <>
      <EuiSpacer size="xs" />
      <EuiText size="xs">Send your thoughts straight to Elastic.</EuiText>
      <EuiSpacer size="m" />
      <EuiForm component="form">
        <EuiFormRow label="Company name">
          <EuiFieldText name="company_name" />
        </EuiFormRow>
        <EuiFormRow label="Country/Region">
          <EuiSelect
            hasNoInitialSelection
            onChange={() => {}}
            options={[
              { value: 'option_one', text: 'Option one' },
              { value: 'option_two', text: 'Option two' },
              { value: 'option_three', text: 'Option three' },
            ]}
          />
        </EuiFormRow>
        <EuiFormRow label="Feedback about">
          <EuiSelect
            hasNoInitialSelection
            onChange={() => {}}
            options={[
              { value: 'option_one', text: 'Option one' },
              { value: 'option_two', text: 'Option two' },
              { value: 'option_three', text: 'Option three' },
            ]}
          />
        </EuiFormRow>
        <EuiFormRow label="Please share your feedback">
          <EuiTextArea placeholder="" />
        </EuiFormRow>

        <EuiButton type="submit" fill>
          Submit
        </EuiButton>
      </EuiForm>
    </>
  );
};
