/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface FooterProps {
  url: string;
  label: string;
}

export function Footer({ url, label }: FooterProps) {
  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiText>
          <p>
            <FormattedMessage
              id="home.exploreYourDataDescription"
              defaultMessage="When all steps are complete, you're ready to explore your data."
            />
          </p>
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiButton fill href={url}>
          {label}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
