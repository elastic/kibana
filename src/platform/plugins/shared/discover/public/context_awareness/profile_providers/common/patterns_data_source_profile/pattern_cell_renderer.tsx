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
import { EuiCode, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { extractCategorizeTokens } from '@kbn/esql-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

interface Props {
  pattern: string;
  isDetails: boolean;
  defaultRowHeight?: number;
}

export const PatternCellRenderer: FC<Props> = ({ pattern, isDetails, defaultRowHeight }) => {
  const { euiTheme } = useEuiTheme();
  const styles = useMemoCss(componentStyles);

  const keywords = useMemo(() => extractCategorizeTokens(pattern), [pattern]);
  const containerStyle = useMemo(
    () => getContainerStyle(euiTheme, defaultRowHeight),
    [euiTheme, defaultRowHeight]
  );

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
      <div css={styles.detailsContainer}>
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
      </div>
    );
  }

  return <div css={containerStyle}>{formattedTokens}</div>;
};

const componentStyles = {
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
  detailsContainer: () =>
    css({
      maxWidth: '600px',
    }),
};

export function getPatternCellRenderer(
  pattern: unknown,
  isDetails: boolean,
  defaultRowHeight?: number
) {
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

function getContainerStyle(euiTheme: UseEuiTheme['euiTheme'], defaultRowHeight?: number) {
  // the keywords are slightly larger than the default text height,
  // so they need to be adjusted to fit within the row height while
  // not truncating the bottom of the text
  let rowHeight = 2;
  if (defaultRowHeight === undefined) {
    rowHeight = 2;
  } else if (defaultRowHeight < 2) {
    rowHeight = 1;
  } else {
    rowHeight = Math.floor(defaultRowHeight / 1.5);
  }

  return {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical' as const,
    WebkitLineClamp: rowHeight,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    transform: `translateY(calc(${euiTheme.size.m} / 4))`, // we apply this transform so that the component appears vertically centered
  };
}
