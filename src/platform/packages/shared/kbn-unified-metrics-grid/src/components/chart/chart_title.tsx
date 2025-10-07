/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { useEuiTheme, EuiHighlight, EuiTextTruncate } from '@elastic/eui';
import { css } from '@emotion/react';
import { getHighlightColors } from '@kbn/data-grid-in-table-search/src/get_highlight_colors';
import React, { useMemo } from 'react';

export const ChartTitle = ({
  searchTerm,
  title,
}: {
  searchTerm: string;
  title: string;
}): React.ReactNode => {
  const { euiTheme } = useEuiTheme();
  const colors = useMemo(() => getHighlightColors(euiTheme), [euiTheme]);

  const { headerStyles, chartTitleCss } = useMemo(() => {
    return {
      headerStyles: css`
        position: absolute;
        width: 100%;
        max-height: ${euiTheme.size.l};
        z-index: ${Number(euiTheme.levels.content) + 1};
        transition: outline-color ${euiTheme.animation.extraFast},
          z-index ${euiTheme.animation.extraFast};
        transition-delay: ${euiTheme.animation.fast};

        overflow: hidden;
        height: 100%;
        line-height: ${euiTheme.size.l};
        padding: 0px ${euiTheme.size.s};

        pointer-events: none;
      `,
      chartTitleCss: css`
        font-weight: ${euiTheme.font.weight.bold};
      `,
    };
  }, [
    euiTheme.size.l,
    euiTheme.size.s,
    euiTheme.levels.content,
    euiTheme.animation.extraFast,
    euiTheme.animation.fast,
    euiTheme.font.weight.bold,
  ]);

  return (
    <div css={headerStyles} className="metricsExperienceChartTitle">
      <span css={chartTitleCss}>
        {searchTerm ? (
          <EuiHighlight
            css={css`
              & mark {
                color: ${colors.highlightColor};
                background-color: ${colors.highlightBackgroundColor};
              }
            `}
            strict={false}
            highlightAll
            search={searchTerm}
          >
            {title}
          </EuiHighlight>
        ) : (
          <EuiTextTruncate text={title} />
        )}
      </span>
    </div>
  );
};
