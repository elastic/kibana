/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonGroup, EuiFormRow } from '@elastic/eui';
import type { SourceDisplayMode } from '../types';
const dataTestSubj = 'unifiedDataTableViewModeSettings';

export interface ViewModeSettingsProps {
  sourceDisplayMode: SourceDisplayMode;
  onChangeSourceDisplayMode: (sourceDisplayMode: SourceDisplayMode) => void;
}

export function ViewModeSettings({
  sourceDisplayMode,
  onChangeSourceDisplayMode,
}: ViewModeSettingsProps) {
  const label = i18n.translate('unifiedDataTable.viewMode.label', {
    defaultMessage: 'View mode',
  });

  const viewModeOptions = [
    {
      id: 'summary',
      label: i18n.translate('unifiedDataTable.viewMode.default', {
        defaultMessage: 'Default',
      }),
      'data-test-subj': `${dataTestSubj}_viewMode_summary`,
    },
    {
      id: 'json',
      label: i18n.translate('unifiedDataTable.viewMode.json', {
        defaultMessage: 'JSON',
      }),
      'data-test-subj': `${dataTestSubj}_viewMode_json`,
    },
  ];

  return (
    <EuiFormRow
      label={label}
      aria-label={label}
      display="columnCompressed"
      data-test-subj={dataTestSubj}
      fullWidth
    >
      <EuiButtonGroup
        isFullWidth
        legend={label}
        buttonSize="compressed"
        options={viewModeOptions}
        idSelected={sourceDisplayMode}
        onChange={(id) => onChangeSourceDisplayMode(id as SourceDisplayMode)}
        data-test-subj={`${dataTestSubj}_viewModeButtonGroup`}
      />
    </EuiFormRow>
  );
}
