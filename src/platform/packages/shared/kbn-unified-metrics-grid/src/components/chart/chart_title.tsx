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
  euiTextTruncate,
  EuiToolTip,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { getHighlightColors } from '@kbn/data-grid-in-table-search/src/get_highlight_colors';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';

export const ChartTitle = ({
  searchTerm,
  title,
  description,
  truncation,
}: {
  searchTerm: string;
  title: string;
  description?: React.ReactNode;
  truncation: EuiTextTruncationTypes;
}): React.ReactNode => {
  const { euiTheme } = useEuiTheme();
  const colors = useMemo(() => getHighlightColors(euiTheme), [euiTheme]);

  // styles here were copied from use_hover_actions_styles.tsx
  const { captionStyles, headerStyles } = useMemo(() => {
    return {
      captionStyles: css`
        position: absolute;
        width: 100%;
        height: ${euiTheme.size.l};
        z-index: ${Number(euiTheme.levels.content) + 1};

        transition: outline-color ${euiTheme.animation.extraFast},
          z-index ${euiTheme.animation.extraFast};
        transition-delay: ${euiTheme.animation.fast};
      `,
      headerStyles: css`
        overflow: hidden;
        height: 100%;
        line-height: ${euiTheme.size.l};
        padding: 0px ${euiTheme.size.s};
        display: flex;
        flex-wrap: nowrap;
        column-gap: ${euiTheme.size.s};
        align-items: center;

        > * {
          min-width: 0;
          flex: 1 !important;
          max-width: 90% !important;
        }
      `,
    };
  }, [
    euiTheme.size.l,
    euiTheme.size.s,
    euiTheme.animation.extraFast,
    euiTheme.animation.fast,
    euiTheme.levels.content,
  ]);

  const chartTitleCss = css`
    ${euiTextTruncate()};

    font-weight: ${euiTheme.font.weight.bold};
  `;

  const titleElement = useMemo(() => {
    return (
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
          <EuiTextTruncate truncation={truncation} text={title} />
        )}
      </span>
    );
  }, [searchTerm, colors, title, truncation, chartTitleCss]);

  if (!description) {
    return titleElement;
  }

  return (
    <figcaption css={captionStyles} className="metricsExperienceChartTitle">
      <div css={headerStyles}>
        {description ? (
          <EuiToolTip
            content={description}
            delay="regular"
            position="top"
            anchorProps={{
              'data-test-subj': 'metricsExperienceChartTooltipAnchor',
            }}
            anchorClassName="eui-fullWidth"
          >
            <h2
              css={css`
                overflow: hidden;
              `}
            >
              <EuiScreenReaderOnly>
                <span id={title}>
                  {i18n.translate('metricsExperience.chart.panelTitle.ariaLabel', {
                    defaultMessage: 'Panel: {title}',
                    values: {
                      title,
                    },
                  })}
                </span>
              </EuiScreenReaderOnly>
              {titleElement}
            </h2>
          </EuiToolTip>
        ) : (
          titleElement
        )}
      </div>
    </figcaption>
  );
};
