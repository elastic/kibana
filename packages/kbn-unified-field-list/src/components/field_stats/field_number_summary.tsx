/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactNode } from 'react';
import {
  EuiBasicTable,
  HorizontalAlignment,
  LEFT_ALIGNMENT,
  RIGHT_ALIGNMENT,
  euiScreenReaderOnly,
} from '@elastic/eui';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { NumberSummary } from '../../types';

interface SummaryTableItem {
  key: string;
  label: ReactNode;
  value: string;
}

export interface FieldNumberSummaryProps {
  dataView: DataView;
  field: DataViewField;
  numberSummary?: NumberSummary;
  'data-test-subj': string;
}

export const FieldNumberSummary: React.FC<FieldNumberSummaryProps> = ({
  dataView,
  field,
  numberSummary,
  'data-test-subj': dataTestSubject,
}) => {
  if (!numberSummary || !isNumberSummaryValid(numberSummary)) {
    return null;
  }

  const formatter = dataView.getFormatterForField(field);

  const summaryTableItems: SummaryTableItem[] = [
    {
      key: 'min',
      label: i18n.translate('unifiedFieldList.fieldStats.numberSummary.minLabel', {
        defaultMessage: 'min',
      }),
      value: formatter.convert(numberSummary.minValue, 'text'),
    },
    {
      key: 'max',
      label: i18n.translate('unifiedFieldList.fieldStats.numberSummary.maxLabel', {
        defaultMessage: 'max',
      }),
      value: formatter.convert(numberSummary.maxValue, 'text'),
    },
  ];
  const summaryTableColumns = [
    {
      field: 'label',
      name: '',
      align: LEFT_ALIGNMENT as HorizontalAlignment,
    },
    {
      field: 'value',
      name: '',
      render: (v: string) => <strong>{v}</strong>,
      align: RIGHT_ALIGNMENT as HorizontalAlignment,
    },
  ];

  const summaryTableTitle = i18n.translate(
    'unifiedFieldList.fieldStats.numberSummary.summaryTableTitle',
    {
      defaultMessage: 'Summary',
    }
  );

  return (
    <EuiBasicTable<SummaryTableItem>
      compressed
      items={summaryTableItems}
      columns={summaryTableColumns}
      tableCaption={summaryTableTitle}
      data-test-subj={`${dataTestSubject}-numberSummary`}
      responsiveBreakpoint={false}
      css={css`
        & .euiTableHeaderCell {
          ${euiScreenReaderOnly()}
        }
        & .euiTableRowCell {
          border-top: none;
        }
      `}
    />
  );
};

export function isNumberSummaryValid(numberSummary?: NumberSummary): boolean {
  return typeof numberSummary?.minValue === 'number' && typeof numberSummary?.maxValue === 'number';
}
