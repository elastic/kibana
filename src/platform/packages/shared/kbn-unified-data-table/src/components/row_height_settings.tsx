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

export enum RowHeightMode {
  auto = 'auto',
  custom = 'custom',
}
export interface RowHeightSettingsProps {
  lineCountInput: number;
  rowHeight?: RowHeightMode;
  maxRowHeight?: number;
  label: string;
  onChangeRowHeight: (newHeightMode: RowHeightMode | undefined) => void;
  onChangeLineCountInput: (newRowHeightLines: number) => void;
  'data-test-subj'?: string;
}

const idPrefix = htmlIdGenerator()();

export function RowHeightSettings({
  lineCountInput,
  label,
  rowHeight,
  onChangeRowHeight,
  onChangeLineCountInput,
  maxRowHeight,
  ['data-test-subj']: dataTestSubj,
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
      >
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiButtonGroup
            isFullWidth
            css={{ flexShrink: 0, flexBasis: '66.6%' }}
            legend={label}
            buttonSize="compressed"
            options={rowHeightModeOptions}
            idSelected={`${idPrefix}${rowHeight ?? RowHeightMode.custom}`}
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
              onChangeLineCountInput(lineCount);
            }}
            min={1}
            max={maxRowHeight ?? 20}
            step={1}
            disabled={rowHeight !== RowHeightMode.custom}
            data-test-subj={`${dataTestSubj}_lineCountNumber`}
          />
        </EuiFlexGroup>
      </EuiFormRow>
    </>
  );
}
