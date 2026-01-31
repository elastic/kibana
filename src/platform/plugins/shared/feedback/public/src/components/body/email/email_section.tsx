/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ChangeEvent } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { EmailInput } from './email_input';
import { EmailConsentCheck } from './email_consent_check';

interface Props {
  email: string;
  allowEmailContact: boolean;
  handleChangeAllowEmailContact: (e: ChangeEvent<HTMLInputElement>) => void;
  handleChangeEmail: (e: ChangeEvent<HTMLInputElement>) => void;
}

export const EmailSection = ({
  email,
  allowEmailContact,
  handleChangeAllowEmailContact,
  handleChangeEmail,
}: Props) => {
  const { euiTheme } = useEuiTheme();

  const sectionCss = css`
    height: ${euiTheme.size.xxxl};
  `;

  return (
    <EuiFormRow fullWidth css={sectionCss}>
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
        <EuiFlexItem>
          <EmailConsentCheck
            allowEmailContact={allowEmailContact}
            handleChangeAllowEmailContact={handleChangeAllowEmailContact}
          />
        </EuiFlexItem>
        {allowEmailContact && (
          <EuiFlexItem>
            <EmailInput email={email} handleChangeEmail={handleChangeEmail} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
