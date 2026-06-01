/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiSpacer, EuiSwitch } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  showPrimaryItemLabels: boolean;
  onChange: (showPrimaryItemLabels: boolean) => void;
}

export const PrimaryLabelsToggle = ({ showPrimaryItemLabels, onChange }: Props) => (
  <>
    <EuiSwitch
      checked={showPrimaryItemLabels}
      compressed
      data-test-subj="customizeNavigationShowPrimaryLabelsToggle"
      label={
        <FormattedMessage
          id="navigationCustomizationComponents.showAppsLabelsLabel"
          defaultMessage="Show apps labels"
        />
      }
      onChange={(event) => onChange(event.target.checked)}
    />
    <EuiSpacer size="l" />
  </>
);
