/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { SourceDocument, type DataGridCellValueElementProps } from '@kbn/unified-data-table';
import {
  ShouldShowFieldInTableHandler,
  getLogDocumentOverview,
  getMessageFieldWithFallbacks,
  getLogLevelCoalescedValue,
  getLogLevelColor,
  LOG_LEVEL_REGEX,
  DataTableRecord,
} from '@kbn/discover-utils';
import { MESSAGE_FIELD } from '@kbn/discover-utils';
import { EuiBadge, EuiThemeComputed, useEuiTheme } from '@elastic/eui';
import type { CSSObject } from '@emotion/react';
import { formatJsonDocumentForContent } from './utils';

interface ContentProps extends DataGridCellValueElementProps {
  isCompressed: boolean;
  isSingleLine?: boolean;
  shouldShowFieldHandler: ShouldShowFieldInTableHandler;
}

const badgeCss: CSSObject = { paddingInline: 0, marginInlineStart: '0 !important', border: 0 };

const LogMessage = ({
  field,
  value,
  className,
}: {
  field: string;
  value: string | React.ReactNode;
  className: string;
}) => {
  const shouldRenderFieldName = field !== MESSAGE_FIELD;

  if (shouldRenderFieldName) {
    return (
      <div className={className}>
        <strong>{field}</strong>{' '}
        <span className={className} data-test-subj="discoverDataTableMessageValue">
          {value}
        </span>
      </div>
    );
  }

  return (
    <p className={className} data-test-subj="discoverDataTableMessageValue">
      {value}
    </p>
  );
};

const getHighlightedMessage = (
  value: string,
  _row: DataTableRecord,
  euiTheme: EuiThemeComputed
): React.ReactNode => {
  return value.split(LOG_LEVEL_REGEX).map((part, idx) => {
    if (LOG_LEVEL_REGEX.test(part)) {
      const coalesced = getLogLevelCoalescedValue(part);
      if (!coalesced) return part;

      const bgColor = getLogLevelColor(coalesced, euiTheme);
      if (!bgColor) return part;

      return (
        <EuiBadge
          key={`logLevelHighlight-${coalesced}-${idx}`}
          color={bgColor}
          data-test-subj={`logLevelHighlight-${coalesced}`}
          css={badgeCss}
        >
          {part}
        </EuiBadge>
      );
    }
    return part;
  });
};

export const Content = ({
  columnId,
  dataView,
  fieldFormats,
  isCompressed,
  isSingleLine = false,
  row,
  shouldShowFieldHandler,
}: ContentProps) => {
  const documentOverview = getLogDocumentOverview(row, { dataView, fieldFormats });
  const { field, value } = getMessageFieldWithFallbacks(documentOverview);

  const { euiTheme } = useEuiTheme();

  const highlightedValue = useMemo(
    () => (value ? getHighlightedMessage(value as string, row, euiTheme) : value),
    [value, row, euiTheme]
  );

  const shouldRenderContent = !!field && !!value && !!highlightedValue;

  return shouldRenderContent ? (
    <LogMessage
      field={field}
      value={highlightedValue}
      className={isSingleLine ? 'eui-textTruncate' : ''}
    />
  ) : (
    <FormattedSourceDocument
      columnId={columnId}
      dataView={dataView}
      fieldFormats={fieldFormats}
      shouldShowFieldHandler={shouldShowFieldHandler}
      isCompressed={isCompressed}
      row={row}
    />
  );
};

type FormattedSourceDocumentProps = Pick<
  ContentProps,
  'columnId' | 'dataView' | 'fieldFormats' | 'isCompressed' | 'row' | 'shouldShowFieldHandler'
>;

const FormattedSourceDocument = ({ row, ...props }: FormattedSourceDocumentProps) => {
  const formattedRow = useMemo(() => formatJsonDocumentForContent(row), [row]);

  return (
    <SourceDocument
      maxEntries={50}
      row={formattedRow}
      useTopLevelObjectColumns={false}
      {...props}
    />
  );
};
