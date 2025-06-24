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
import type { UseEuiTheme } from '@elastic/eui';
import { EuiCode, EuiSpacer, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { extractCategorizeTokens } from '@kbn/esql-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

interface Props {
  pattern: string;
  isDetails: boolean;
  defaultRowHeight?: number;
}

export const PatternCellRenderer: FC<Props> = ({ pattern, isDetails, defaultRowHeight }) => {
  const styles = useMemoCss(componentStyles(defaultRowHeight));

  const keywords = useMemo(() => extractCategorizeTokens(pattern), [pattern]);

  const formattedTokens = useMemo(
    () =>
      keywords.map((keyword, index) => {
        return (
          <EuiCode key={index} css={styles.keyword}>
            {keyword}
          </EuiCode>
        );
      }),
    [styles, keywords]
  );

  if (isDetails) {
    return (
      <>
        <EuiText size="s">
          <strong>
            <FormattedMessage
              id="discover.contextAwareness.patternCellRenderer.tokensLabel"
              defaultMessage="Tokens"
            />
          </strong>
          <EuiSpacer size="s" />
          {formattedTokens}
        </EuiText>

        <EuiSpacer size="m" />

        <EuiText size="s">
          <strong>
            <FormattedMessage
              id="discover.contextAwareness.patternCellRenderer.regexLabel"
              defaultMessage="Regex"
            />
          </strong>
          <EuiSpacer size="s" />
          <span data-test-subj="euiDataGridExpansionPopover-patternRegex">{pattern}</span>
        </EuiText>
        <EuiSpacer size="s" />
      </>
    );
  }

  return <div css={styles.container}>{formattedTokens}</div>;
};

const componentStyles = (defaultRowHeight: number | undefined) => {
  // the keywords are slightly larger than the default text height,
  // so they need to be adjusted to fit within the row height while
  // not truncating the bottom of the text
  const rowHeight = defaultRowHeight ? Math.floor(defaultRowHeight / 1.5) : 2;
  return {
    container: ({ euiTheme }: UseEuiTheme) =>
      css({
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical' as const,
        WebkitLineClamp: rowHeight,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }),
    keyword: ({ euiTheme }: UseEuiTheme) =>
      css({
        marginRight: euiTheme.size.xs,
        marginBottom: `calc(${euiTheme.size.m} / 2)`,
        display: 'inline-block',
        padding: `${euiTheme.size.xxs} ${euiTheme.size.s}`,
        backgroundColor: euiTheme.colors.lightestShade,
        borderRadius: euiTheme.border.radius.small,
        color: euiTheme.colors.textPrimary,
        fontSize: euiTheme.size.m,
      }),
  };
};

export function getPatternCellRenderer(
  row: DataTableRecord,
  columnId: string,
  isDetails: boolean,
  defaultRowHeight?: number
) {
  const pattern = row.flattened[columnId];
  if (pattern === undefined) {
    return '-';
  }
  return (
    <PatternCellRenderer
      pattern={String(pattern)}
      isDetails={isDetails}
      defaultRowHeight={defaultRowHeight}
    />
  );
}
