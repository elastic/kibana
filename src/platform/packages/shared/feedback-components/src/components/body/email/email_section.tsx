/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { EmailInput } from './email_input';
import { EmailConsentCheck } from './email_consent_check';

export interface EmailSectionProps {
  /** Current email value */
  email: string;
  /** Whether the user allows email contact */
  allowEmailContact: boolean;
  /** Callback when email contact consent changes */
  handleChangeAllowEmailContact: (allow: boolean) => void;
  /** Callback when email value changes */
  handleChangeEmail: (email: string) => void;
  /** Callback when email validation status changes */
  onEmailValidationChange: (isValid: boolean) => void;
  /** Function to fetch current user email for pre-filling the input */
  getCurrentUserEmail: () => Promise<string | undefined>;
}

export const EmailSection = ({
  email,
  allowEmailContact,
  handleChangeAllowEmailContact,
  handleChangeEmail,
  onEmailValidationChange,
  getCurrentUserEmail,
}: EmailSectionProps) => {
  return (
    <EuiFormRow display="center">
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EmailConsentCheck
            allowEmailContact={allowEmailContact}
            handleChangeAllowEmailContact={handleChangeAllowEmailContact}
          />
        </EuiFlexItem>
        {allowEmailContact && (
          <EuiFlexItem>
            <EmailInput
              email={email}
              handleChangeEmail={handleChangeEmail}
              onValidationChange={onEmailValidationChange}
              getCurrentUserEmail={getCurrentUserEmail}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
