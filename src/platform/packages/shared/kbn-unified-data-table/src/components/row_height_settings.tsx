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
  EuiButtonGroup,
  EuiFormRow,
  EuiFieldNumber,
  EuiFlexGroup,
  htmlIdGenerator,
} from '@elastic/eui';

export const RowHeightMode = {
  auto: 'auto',
  custom: 'custom',
} as const;

export type RowHeightModeType = keyof typeof RowHeightMode;

export interface RowHeightSettingsProps {
  lineCountInput: number | undefined;
  rowHeight?: RowHeightModeType;
  maxRowHeight?: number;
  label: string;
  onChangeRowHeight: (newHeightMode: RowHeightModeType | undefined) => void;
  onChangeLineCountInput: (newRowHeightLines: number, isValid: boolean) => void;
  'data-test-subj'?: string;
  fullWidth?: boolean;
}

const idPrefix = htmlIdGenerator()();

export function RowHeightSettings({
  lineCountInput,
  label,
  rowHeight = RowHeightMode.custom,
  onChangeRowHeight,
  onChangeLineCountInput,
  maxRowHeight = 20,
  ['data-test-subj']: dataTestSubj,
  fullWidth,
}: RowHeightSettingsProps) {
  const rowHeightModeOptions = [
    {
      id: `${idPrefix}${RowHeightMode.auto}`,
      label: i18n.translate('unifiedDataTable.rowHeight.auto', {
        defaultMessage: 'Auto',
      }),
      'data-test-subj': `${dataTestSubj}_rowHeight_${RowHeightMode.auto}`,
    },
    {
      id: `${idPrefix}${RowHeightMode.custom}`,
      label: i18n.translate('unifiedDataTable.rowHeight.custom', {
        defaultMessage: 'Custom',
      }),
      'data-test-subj': `${dataTestSubj}_rowHeight_${RowHeightMode.custom}`,
    },
  ];

  return (
    <>
      <EuiFormRow
        label={label}
        aria-label={label}
        display="columnCompressed"
        data-test-subj={dataTestSubj}
        fullWidth
      >
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiButtonGroup
            isFullWidth
            css={{ flexShrink: 0, flexBasis: '66.6%' }}
            legend={label}
            buttonSize="compressed"
            options={rowHeightModeOptions}
            idSelected={`${idPrefix}${rowHeight}`}
            onChange={(optionId) => {
              const newMode = optionId.replace(idPrefix, '') as RowHeightSettingsProps['rowHeight'];
              onChangeRowHeight(newMode);
            }}
            data-test-subj={`${dataTestSubj}_rowHeightButtonGroup`}
          />
          <EuiFieldNumber
            compressed
            value={lineCountInput}
            onChange={(e) => {
              const lineCount = Number(e.currentTarget.value);
              onChangeLineCountInput(lineCount, e.target.checkValidity());
            }}
            min={1}
            max={maxRowHeight}
            required
            step={1}
            disabled={rowHeight !== RowHeightMode.custom}
            data-test-subj={`${dataTestSubj}_lineCountNumber`}
          />
        </EuiFlexGroup>
      </EuiFormRow>
    </>
  );
}
