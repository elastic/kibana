/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, type ReactNode } from 'react';
import { SourceDocument, type DataGridCellValueElementProps } from '@kbn/unified-data-table';
import type { ShouldShowFieldInTableHandler } from '@kbn/discover-utils';
import {
  formatFieldStringValueWithHighlights,
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
  value: ReactNode;
  className: string;
}) => {
  const shouldRenderFieldName = field !== MESSAGE_FIELD && field !== OTEL_MESSAGE_FIELD;

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

interface LogLevelSpanProps {
  match: string;
  bgColor: string;
  textColor: string;
}

const LogLevelSpan = ({ match, bgColor, textColor }: LogLevelSpanProps) => (
  <span
    data-test-subj="logLevelSpan"
    style={{
      color: textColor,
      backgroundColor: bgColor,
      borderRadius: 2,
      padding: '0 2px',
    }}
  >
    {match}
  </span>
);

/**
 * Applies log level highlighting to a React node tree. This function processes both
 * string nodes and existing React elements (like search highlights), preserving the
 * search highlight <mark> elements while adding log level styling spans.
 * @internal Exported for testing purposes only
 */
export const applyLogLevelHighlighting = (
  node: ReactNode,
  euiTheme: EuiThemeComputed,
  isDarkTheme: boolean
): ReactNode => {
  if (typeof node === 'string') {
    return highlightLogLevelsInString(node, euiTheme, isDarkTheme);
  }

  if (Array.isArray(node)) {
    return node.map((child, index) => (
      <React.Fragment key={index}>
        {applyLogLevelHighlighting(child, euiTheme, isDarkTheme)}
      </React.Fragment>
    ));
  }

  if (React.isValidElement(node)) {
    const { children } = node.props as { children?: ReactNode };
    if (children !== undefined) {
      return React.cloneElement(
        node,
        undefined,
        applyLogLevelHighlighting(children, euiTheme, isDarkTheme)
      );
    }
    return node;
  }

  return node;
};

/**
 * Highlights log level terms in a plain string, returning React nodes.
 * @internal Exported for testing purposes only
 */
export const highlightLogLevelsInString = (
  text: string,
  euiTheme: EuiThemeComputed,
  isDarkTheme: boolean
): ReactNode => {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const regex = new RegExp(LOG_LEVEL_REGEX.source, 'gi');

  while ((match = regex.exec(text)) !== null) {
    const coalesced = getLogLevelCoalescedValue(match[0]);
    if (!coalesced) continue;

    const bgColor = getLogLevelColor(coalesced, euiTheme);
    if (!bgColor) continue;

    const textColor = makeHighContrastColor(
      isDarkTheme ? euiTheme.colors.textGhost : euiTheme.colors.textInk,
      4.5
    )(bgColor);

    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    parts.push(
      <LogLevelSpan
        key={`log-level-${match.index}`}
        match={match[0]}
        bgColor={bgColor}
        textColor={textColor}
      />
    );

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  if (parts.length === 0) return text;
  if (parts.length === 1) return parts[0];
  return <>{parts}</>;
};

export const Content = ({
  columnId,
  dataView,
  fieldFormats,
  isCompressed,
  isSingleLine = false,
  row,
  shouldShowFieldHandler,
  columnsMeta,
}: ContentProps) => {
  const { field, value } = getMessageFieldWithFallbacks(row.flattened);

  const { euiTheme } = useEuiTheme();
  const isDarkTheme = useKibanaIsDarkMode();

  const highlightedValue = useMemo(() => {
    if (!value) return undefined;

    // Use field formatter's reactConvert which handles search highlighting natively
    const withSearchHighlights = formatFieldStringValueWithHighlights({
      value,
      hit: row.raw,
      fieldFormats,
      fieldName: field,
    });

    // Then apply log level highlighting on top, preserving search highlights
    return applyLogLevelHighlighting(withSearchHighlights, euiTheme, isDarkTheme);
  }, [value, fieldFormats, row.raw, field, euiTheme, isDarkTheme]);

  const shouldRenderContent = !!field && !!value && highlightedValue !== undefined;

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
      columnsMeta={columnsMeta}
    />
  );
};

type FormattedSourceDocumentProps = Pick<
  ContentProps,
  | 'columnId'
  | 'dataView'
  | 'fieldFormats'
  | 'isCompressed'
  | 'row'
  | 'shouldShowFieldHandler'
  | 'columnsMeta'
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
