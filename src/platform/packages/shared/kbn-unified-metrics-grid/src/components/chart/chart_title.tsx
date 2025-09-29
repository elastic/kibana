/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import {
  EuiTextTruncate,
  type EuiTextTruncationTypes,
  useEuiTheme,
  EuiHighlight,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { getHighlightColors } from '@kbn/data-grid-in-table-search/src/get_highlight_colors';
import React, { useMemo } from 'react';

export const ChartTitle = ({
  searchTerm,
  text,
  truncation,
}: {
  searchTerm: string;
  text: string;
  truncation: EuiTextTruncationTypes;
}): React.ReactNode => {
  const { euiTheme } = useEuiTheme();
  const colors = useMemo(() => getHighlightColors(euiTheme), [euiTheme]);

  const chartTitleCss = css`
    min-height: ${euiTheme.size.l};
    max-height: ${euiTheme.size.l};
    max-width: 90%;
    position: absolute;
    height: 100%;
    width: 100%;
    z-index: 9000;
    padding: ${euiTheme.size.s};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: ${euiTheme.font.weight.semiBold};
  `;

  if (!searchTerm) {
    return (
      <h3 css={chartTitleCss}>
        <EuiTextTruncate truncation={truncation} text={text} />
      </h3>
    );
  }

  return (
    <h3 css={chartTitleCss}>
      <EuiHighlight
        css={css`
          & mark {
            color: ${colors.highlightColor};
            background-color: ${colors.highlightBackgroundColor};
          }
          overflow: ellipsis;
          text-overflow: ellipsis;
          white-space: nowrap;
        `}
        strict={false}
        highlightAll
        search={searchTerm}
      >
        {text}
      </EuiHighlight>
    </h3>
  );
};
