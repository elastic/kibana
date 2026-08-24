/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiSwitch, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const summaryToggleLabel = i18n.translate('unifiedDataTable.summaryColumnToggleLabel', {
  defaultMessage: 'Pin summary',
});

export const SummaryColumnToggle = ({
  checked,
  disabled,
  onChange,
  showLabel = true,
  dataTestSubj,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
  showLabel?: boolean;
  dataTestSubj: string;
}) => (
  <EuiSwitch
    compressed={true}
    label={<EuiText size="xs">{summaryToggleLabel}</EuiText>}
    showLabel={showLabel}
    disabled={disabled}
    checked={checked}
    onChange={(e) => onChange(e.target.checked)}
    data-test-subj={dataTestSubj}
  />
);
