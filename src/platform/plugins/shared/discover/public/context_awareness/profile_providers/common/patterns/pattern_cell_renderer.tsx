/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { FC } from 'react';
import { EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { extractKeywordsFromRegex } from '@kbn/aiops-log-pattern-analysis';

interface Props {
  row: DataTableRecord;
  columnId: string;
  isDetails: boolean;
  defaultRowHeight?: number;
}

export const PatternCellRenderer: FC<Props> = ({ row, columnId, isDetails, defaultRowHeight }) => {
  const { euiTheme } = useEuiTheme();

  const pattern = useMemo(() => String(row.flattened[columnId]), [columnId, row.flattened]);

  const keywordStyle = useMemo(
    () => ({
      marginRight: euiTheme.size.xs,
      marginBottom: '6px', // find a suitable eui variable for this
      display: 'inline-block',
      padding: `${euiTheme.size.xxs} ${euiTheme.size.s}`,
      backgroundColor: euiTheme.colors.lightestShade,
      borderRadius: euiTheme.border.radius.small,
      color: euiTheme.colors.textPrimary,
    }),
    [euiTheme]
  );

  const keywords = useMemo(() => extractKeywordsFromRegex(pattern), [pattern]);

  const formattedTokens = useMemo(
    () =>
      keywords.map((keyword, index) => {
        return (
          <span key={index} css={keywordStyle}>
            <code>{keyword}</code>
          </span>
        );
      }),
    [keywordStyle, keywords]
  );

  // the keywords are slightly larger than the default text height,
  // so they need to be adjusted to fit within the row height while
  // not truncating the bottom of the text
  const rowHeight = useMemo(
    () => (defaultRowHeight ? Math.floor(defaultRowHeight / 1.5) : 2),
    [defaultRowHeight]
  );

  const containerStyle = useMemo(
    () => ({
      display: '-webkit-box',
      WebkitBoxOrient: 'vertical' as const,
      WebkitLineClamp: rowHeight,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }),
    [rowHeight]
  );

  if (isDetails) {
    return (
      <>
        <EuiText size="s">
          <strong>Tokens</strong>
          <EuiSpacer size="s" />
          {formattedTokens}
        </EuiText>

        <EuiSpacer size="m" />

        <EuiText size="s">
          <strong>Regex</strong>
          <EuiSpacer size="s" />
          {pattern}
        </EuiText>
        <EuiSpacer size="s" />
      </>
    );
  }

  return <div css={containerStyle}>{formattedTokens}</div>;
};

export function getPatternCellRenderer({
  row,
  columnId,
  isDetails,
  defaultRowHeight,
}: Props & {
  defaultRowHeight?: number;
}) {
  return (
    <PatternCellRenderer
      row={row}
      columnId={columnId}
      isDetails={isDetails}
      defaultRowHeight={defaultRowHeight}
    />
  );
}
