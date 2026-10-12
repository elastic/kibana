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
import {
  EuiBetaBadge,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { DocumentsDisplayMode } from '../types';
const dataTestSubj = 'unifiedDataTableViewModeSettings';

export interface ViewModeSettingsProps {
  documentsDisplayMode: DocumentsDisplayMode;
  onChangeDocumentsDisplayMode: (documentsDisplayMode: DocumentsDisplayMode) => void;
  isNew?: boolean;
}

export function ViewModeSettings({
  documentsDisplayMode,
  onChangeDocumentsDisplayMode,
  isNew = false,
}: ViewModeSettingsProps) {
  const { euiTheme } = useEuiTheme();

  const label = i18n.translate('unifiedDataTable.viewMode.label', {
    defaultMessage: 'View mode',
  });

  const viewModeOptions = [
    {
      id: 'table',
      label: i18n.translate('unifiedDataTable.viewMode.default', {
        defaultMessage: 'Table',
      }),
      'data-test-subj': `${dataTestSubj}_viewMode_table`,
    },
    {
      id: 'json',
      label: i18n.translate('unifiedDataTable.viewMode.json', {
        defaultMessage: 'JSON',
      }),
      'data-test-subj': `${dataTestSubj}_viewMode_json`,
    },
  ];

  const formLabel = isNew ? (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>{label}</EuiFlexItem>
      <EuiFlexItem
        grow={false}
        css={css`
          line-height: 0;
        `}
      >
        <EuiBetaBadge
          size="s"
          label={i18n.translate('unifiedDataTable.viewMode.newBadgeLabel', {
            defaultMessage: 'New',
          })}
          data-test-subj={`${dataTestSubj}_newBadge`}
          css={css`
            background-color: ${euiTheme.colors.backgroundFilledPrimary};
            color: ${euiTheme.colors.textInverse};
            border: none;
          `}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    label
  );

  return (
    <EuiFormRow
      label={formLabel}
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
        idSelected={documentsDisplayMode}
        onChange={(id) => onChangeDocumentsDisplayMode(id as DocumentsDisplayMode)}
        data-test-subj={`${dataTestSubj}_viewModeButtonGroup`}
      />
    </EuiFormRow>
  );
}
