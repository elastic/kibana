/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonGroup,
  EuiFormRow,
  EuiFieldNumber,
  EuiFlexGroup,
  htmlIdGenerator,
} from '@elastic/eui';

export enum RowHeightMode {
  single = 'single',
  auto = 'auto',
  custom = 'custom',
}
export interface RowHeightSettingsProps {
  rowHeight?: RowHeightMode;
  rowHeightLines?: number;
  maxRowHeight?: number;
  label: string;
  onChangeRowHeight: (newHeightMode: RowHeightMode | undefined) => void;
  onChangeRowHeightLines: (newRowHeightLines: number) => void;
  'data-test-subj'?: string;
}

const idPrefix = htmlIdGenerator()();

export function RowHeightSettings({
  label,
  rowHeight,
  rowHeightLines,
  onChangeRowHeight,
  onChangeRowHeightLines,
  maxRowHeight,
  ['data-test-subj']: dataTestSubj,
}: RowHeightSettingsProps) {
  const prevRowHeightRef = useRef<RowHeightMode | undefined>();
  const [lineCountInput, setLineCountInput] = useState(rowHeightLines || 2);

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

  useEffect(() => {
    if (prevRowHeightRef.current === RowHeightMode.auto && rowHeight === RowHeightMode.custom) {
      onChangeRowHeightLines(lineCountInput);
    }
    prevRowHeightRef.current = rowHeight;
  }, [rowHeight, onChangeRowHeightLines, lineCountInput]);

  return (
    <>
      <EuiFormRow label={label} display="columnCompressed" data-test-subj={dataTestSubj}>
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
              setLineCountInput(lineCount);
              onChangeRowHeightLines(lineCount);
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
