/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBasicTable, EuiText } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';

export interface GenAiDetailsTableRow {
  id: string;
  label: React.ReactNode;
  content: React.ReactNode;
}

export function GenAiFieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <EuiText size="xs">
      <strong>{children}</strong>
    </EuiText>
  );
}

const detailTableCss = css`
  thead {
    display: none;
  }
  tr:first-child td {
    border-top: none;
  }
  tr:last-child td {
    border-bottom: none;
  }
`;

const detailColumns: Array<EuiBasicTableColumn<GenAiDetailsTableRow>> = [
  {
    field: 'label' as const,
    name: i18n.translate('apmUiShared.genAi.details.fieldColumnLabel', {
      defaultMessage: 'Field',
    }),
    width: '160px',
    render: (label: React.ReactNode) => <GenAiFieldLabel>{label}</GenAiFieldLabel>,
  },
  {
    field: 'content' as const,
    name: i18n.translate('apmUiShared.genAi.details.valueColumnLabel', {
      defaultMessage: 'Value',
    }),
    render: (content: React.ReactNode) => content,
  },
];

/** Renders the fixed two-column table used for GenAI details. */
export function GenAiDetailsTable({ rows }: { rows: GenAiDetailsTableRow[] }) {
  return (
    <EuiBasicTable
      itemId="id"
      tableLayout="auto"
      compressed
      items={rows}
      columns={detailColumns}
      data-test-subj="genAiDetails"
      css={detailTableCss}
      tableCaption={i18n.translate('apmUiShared.genAi.section.details.tableCaption', {
        defaultMessage: 'GenAI details',
      })}
    />
  );
}
