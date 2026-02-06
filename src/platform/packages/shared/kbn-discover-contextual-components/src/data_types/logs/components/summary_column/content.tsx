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
import type { ShouldShowFieldInTableHandler, DataTableRecord } from '@kbn/discover-utils';
import {
  getMessageFieldWithFallbacks,
  getLogLevelCoalescedValue,
  getLogLevelColor,
  LOG_LEVEL_REGEX,
  OTEL_MESSAGE_FIELD,
} from '@kbn/discover-utils';
import { MESSAGE_FIELD } from '@kbn/discover-utils';
import type { EuiThemeComputed } from '@elastic/eui';
import { makeHighContrastColor, useEuiTheme } from '@elastic/eui';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';
import { escape } from 'lodash';
import { formatJsonDocumentForContent } from './utils';

interface ContentProps extends DataGridCellValueElementProps {
  isCompressed: boolean;
  isSingleLine?: boolean;
  shouldShowFieldHandler: ShouldShowFieldInTableHandler;
}

const LogMessage = ({
  field,
  value,
  className,
}: {
  field: string;
  value: string | HTMLElement;
  className: string;
}) => {
  const shouldRenderFieldName = field !== MESSAGE_FIELD && field !== OTEL_MESSAGE_FIELD;

  if (shouldRenderFieldName) {
    return (
      <div className={className}>
        <strong>{field}</strong>{' '}
        <span
          className={className}
          data-test-subj="discoverDataTableMessageValue"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: value }}
        />
      </div>
    );
  }

  return (
    <p
      className={className}
      data-test-subj="discoverDataTableMessageValue"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: value }}
    />
  );
};

const getHighlightedMessage = (
  value: string,
  _row: DataTableRecord,
  euiTheme: EuiThemeComputed,
  isDarkTheme: boolean
): string => {
  return value.replace(LOG_LEVEL_REGEX, (match) => {
    const coalesced = getLogLevelCoalescedValue(match);
    if (!coalesced) return match;

    const bgColor = getLogLevelColor(coalesced, euiTheme);
    if (!bgColor) return match;

    // Use EUI's makeHighContrastColor utility to calculate appropriate text color
    // This function automatically determines the best contrasting color based on WCAG standards
    const textColor = makeHighContrastColor(
      isDarkTheme ? euiTheme.colors.ghost : euiTheme.colors.ink, // preferred foreground color
      4.5 // WCAG AA contrast ratio (default in EUI)
    )(bgColor);

    return `<span style="color:${textColor};background-color:${bgColor};border-radius:2px;padding:0 2px;">${match}</span>`;
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
  // Use OTel fallback version that returns the actual field name used
  const { field, value } = getMessageFieldWithFallbacks(row.flattened);

  const { euiTheme } = useEuiTheme();
  const isDarkTheme = useKibanaIsDarkMode();

  const highlightedValue = useMemo(
    () => (value ? getHighlightedMessage(escape(value), row, euiTheme, isDarkTheme) : value),
    [value, row, euiTheme, isDarkTheme]
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
