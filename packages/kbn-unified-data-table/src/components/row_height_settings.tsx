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
import { EuiButtonGroup, EuiFormRow, EuiRange, htmlIdGenerator } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';

export enum RowHeightMode {
  auto = 'auto',
  single = 'single',
  custom = 'custom',
}
export interface RowHeightSettingsProps {
  rowHeight?: RowHeightMode;
  rowHeightLines?: number;
  maxRowHeight?: number;
  label: string;
  compressed?: boolean;
  onChangeRowHeight: (newHeightMode: RowHeightMode | undefined) => void;
  onChangeRowHeightLines: (newRowHeightLines: number) => void;
  'data-test-subj'?: string;
}

const idPrefix = htmlIdGenerator()();

export function RowHeightSettings({
  label,
  rowHeight,
  rowHeightLines,
  compressed,
  onChangeRowHeight,
  onChangeRowHeightLines,
  maxRowHeight,
  ['data-test-subj']: dataTestSubj,
}: RowHeightSettingsProps) {
  const rowHeightModeOptions = [
    {
      id: `${idPrefix}${RowHeightMode.single}`,
      label: i18n.translate('unifiedDataTable.rowHeight.single', {
        defaultMessage: 'Single',
      }),
      'data-test-subj': `${dataTestSubj}_rowHeight_${RowHeightMode.single}`,
    },
    {
      id: `${idPrefix}${RowHeightMode.auto}`,
      label: i18n.translate('unifiedDataTable.rowHeight.auto', {
        defaultMessage: 'Auto fit',
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
      <EuiFormRow label={label} display="columnCompressed" data-test-subj={dataTestSubj}>
        <>
          <EuiButtonGroup
            isFullWidth
            legend={label}
            buttonSize="compressed"
            options={rowHeightModeOptions}
            idSelected={`${idPrefix}${rowHeight ?? RowHeightMode.single}`}
            onChange={(optionId) => {
              const newMode = optionId.replace(idPrefix, '') as RowHeightSettingsProps['rowHeight'];
              onChangeRowHeight(newMode);
            }}
            data-test-subj={`${dataTestSubj}_rowHeightButtonGroup`}
          />
          {rowHeight === RowHeightMode.custom ? (
            <EuiRange
              compressed
              fullWidth
              showInput
              min={1}
              max={maxRowHeight ?? 20}
              step={1}
              value={rowHeightLines ?? 2}
              onChange={(e) => {
                const lineCount = Number(e.currentTarget.value);
                onChangeRowHeightLines(lineCount);
              }}
              data-test-subj={`${dataTestSubj}_lineCountNumber`}
              css={{
                marginTop: compressed ? euiThemeVars.euiSizeXS : euiThemeVars.euiSizeM,
              }}
            />
          ) : null}
        </>
      </EuiFormRow>
    </>
  );
}
