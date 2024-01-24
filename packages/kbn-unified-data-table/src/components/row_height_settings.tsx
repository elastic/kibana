/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonGroup, EuiFormRow, EuiRange, htmlIdGenerator, EuiSpacer } from '@elastic/eui';

export interface RowHeightSettingsProps {
  rowHeight?: 'auto' | 'single' | 'custom';
  rowHeightLines?: number;
  maxRowHeight?: number;
  label: string;
  onChangeRowHeight: (newHeightMode: 'auto' | 'single' | 'custom' | undefined) => void;
  onChangeRowHeightLines: (newRowHeightLines: number) => void;
  'data-test-subj'?: string;
}

const idPrefix = htmlIdGenerator()();

export function RowHeightSettings(props: RowHeightSettingsProps) {
  const {
    label,
    rowHeight,
    rowHeightLines,
    onChangeRowHeight,
    onChangeRowHeightLines,
    maxRowHeight,
    ['data-test-subj']: dataTestSubj,
  } = props;

  const rowHeightModeOptions = [
    {
      id: `${idPrefix}single`,
      label: i18n.translate('unifiedDataTable.rowHeight.single', {
        defaultMessage: 'Single',
      }),
      'data-test-subj': `${dataTestSubj}_rowHeight_single`,
    },
    {
      id: `${idPrefix}auto`,
      label: i18n.translate('unifiedDataTable.rowHeight.auto', {
        defaultMessage: 'Auto fit',
      }),
      'data-test-subj': `${dataTestSubj}_rowHeight_auto`,
    },
    {
      id: `${idPrefix}custom`,
      label: i18n.translate('unifiedDataTable.rowHeight.custom', {
        defaultMessage: 'Custom',
      }),
      'data-test-subj': `${dataTestSubj}_rowHeight_custom`,
    },
  ];

  return (
    <>
      <EuiFormRow label={label} display="columnCompressed" data-test-subj={dataTestSubj}>
        <>
          <EuiButtonGroup
            isFullWidth
            legend={label}
            name="legendLocation"
            buttonSize="compressed"
            options={rowHeightModeOptions}
            idSelected={`${idPrefix}${rowHeight ?? 'single'}`}
            onChange={(optionId) => {
              const newMode = optionId.replace(idPrefix, '') as RowHeightSettingsProps['rowHeight'];
              onChangeRowHeight(newMode);
            }}
          />
          {rowHeight === 'custom' ? (
            <>
              <EuiSpacer size="xs" />
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
              />
            </>
          ) : null}
        </>
      </EuiFormRow>
    </>
  );
}
