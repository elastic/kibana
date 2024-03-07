/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';

interface IncludeCitationsFieldProps {
  checked: boolean;
  onChange: (value: boolean) => void;
}

export const IncludeCitationsField: React.FC<IncludeCitationsFieldProps> = ({
  checked,
  onChange,
}) => (
  <EuiFormRow>
    <EuiSwitch
      label={i18n.translate('playground.sidebar.citationsField.label', {
        defaultMessage: 'Include citations',
      })}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
  </EuiFormRow>
);
