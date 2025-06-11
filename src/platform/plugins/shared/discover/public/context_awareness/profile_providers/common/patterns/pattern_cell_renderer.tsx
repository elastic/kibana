/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { FC } from 'react';
import { EuiText, useEuiTheme } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';

export interface Props {
  row: DataTableRecord;
  columnId: string;
  isDetails?: boolean;
}

export const PatternCellRenderer: FC<Props> = ({ row, columnId, isDetails }) => {
  const { euiTheme } = useEuiTheme();

  const pattern = String(row.flattened[columnId]);

  if (isDetails) {
    return <EuiText size="s">{pattern}</EuiText>;
  }

  const keywordStyle = {
    marginRight: euiTheme.size.xs,
    marginBottom: euiTheme.size.xs,
    display: 'inline-block',
    padding: `${euiTheme.size.xxs} ${euiTheme.size.s}`,
    backgroundColor: euiTheme.colors.lightestShade,
    borderRadius: euiTheme.border.radius.small,
    color: euiTheme.colors.textPrimary,
  };

  const keywords = extractGenericKeywords(pattern);
  return (
    <>
      {keywords.map((keyword, index) => {
        return (
          <div key={index} css={keywordStyle}>
            <code>{keyword}</code>
          </div>
        );
      })}
    </>
  );
};

/**
 * Extracts "keywords" from a regex string by stripping leading/trailing '.*?'
 * and splitting the remainder by '.+?'.
 *
 * @param {string} regexString The regular expression string.
 * @returns {string[]} An array of extracted "keywords".
 */
function extractGenericKeywords(regexString: string) {
  let cleanedString = regexString;

  // Strip leading '.*?'
  if (cleanedString.startsWith('.*?')) {
    cleanedString = cleanedString.substring('.*?'.length);
  }

  // Strip trailing '.*?'
  if (cleanedString.endsWith('.*?')) {
    cleanedString = cleanedString.substring(0, cleanedString.length - '.*?'.length);
  }

  // Split by '.+?'
  // Escape the '.' so it's treated as a literal dot, not a wildcard
  // '.+?' as a literal string to split by.
  const keywords = cleanedString.split(/\.\+\?/);
  return keywords.map((keyword) => keyword.trim()).filter((keyword) => keyword.length > 0);
}
