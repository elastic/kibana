/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tint, useEuiBackgroundColor, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { CELL_CLASS } from '../../../utils/get_render_cell_value';
import { DocumentDiffMode } from '../types';

export const FIELD_NAME_CLASS = 'unifiedDataTable__comparisonFieldName';
export const BASE_CELL_CLASS = 'unifiedDataTable__comparisonBaseDocCell';
export const MATCH_CELL_CLASS = 'unifiedDataTable__comparisonMatchCell';
export const DIFF_CELL_CLASS = 'unifiedDataTable__comparisonDiffCell';
export const SEGMENT_CLASS = 'unifiedDataTable__comparisonSegment';
export const ADDED_SEGMENT_CLASS = 'unifiedDataTable__comparisonAddedSegment';
export const REMOVED_SEGMENT_CLASS = 'unifiedDataTable__comparisonRemovedSegment';

export const useComparisonCss = ({
  diffMode,
  showDiffDecorations,
}: {
  diffMode?: DocumentDiffMode;
  showDiffDecorations?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const baseCellBackgroundColor = useEuiBackgroundColor('subdued', { method: 'transparent' });
  const matchSegmentBackgroundColor = useEuiBackgroundColor('success');
  const diffSegmentBackgroundColor = useEuiBackgroundColor('danger');

  const indicatorCss = css`
    position: absolute;
    width: ${euiTheme.size.s};
    height: 100%;
    margin-left: calc(-${euiTheme.size.s} - calc(${euiTheme.size.xs} / 2));
    text-align: center;
    line-height: ${euiTheme.font.scale.m};
    font-weight: ${euiTheme.font.weight.medium};
  `;

  return css`
    .${CELL_CLASS} {
      white-space: pre-wrap;
    }

    .${FIELD_NAME_CLASS} {
      font-weight: ${euiTheme.font.weight.semiBold};
    }

    .${BASE_CELL_CLASS} {
      background-color: ${baseCellBackgroundColor};
    }

    ${diffMode === 'basic' &&
    css`
      .${MATCH_CELL_CLASS} {
        .${CELL_CLASS} {
          &,
          & * {
            color: ${euiTheme.colors.successText} !important;
          }
        }
      }

      .${DIFF_CELL_CLASS} {
        .${CELL_CLASS} {
          &,
          & * {
            color: ${euiTheme.colors.dangerText} !important;
          }
        }
      }
    `}

    .${SEGMENT_CLASS} {
      position: relative;
    }

    .${ADDED_SEGMENT_CLASS} {
      background-color: ${matchSegmentBackgroundColor};
      color: ${euiTheme.colors.successText};
    }

    .${REMOVED_SEGMENT_CLASS} {
      background-color: ${diffSegmentBackgroundColor};
      color: ${euiTheme.colors.dangerText};
    }

    ${(diffMode === 'chars' || diffMode === 'words') &&
    showDiffDecorations &&
    css`
      .${ADDED_SEGMENT_CLASS} {
        text-decoration: underline;
      }

      .${REMOVED_SEGMENT_CLASS} {
        text-decoration: line-through;
      }
    `}

    ${diffMode === 'lines' &&
    css`
      .${SEGMENT_CLASS} {
        padding-left: calc(${euiTheme.size.xs} / 2);
      }

      ${showDiffDecorations &&
      css`
        .${ADDED_SEGMENT_CLASS}:before {
          content: '+';
          ${indicatorCss}
          background-color: ${euiTheme.colors.success};
          color: ${euiTheme.colors.lightestShade};
        }

        .${REMOVED_SEGMENT_CLASS}:before {
          content: '-';
          ${indicatorCss}
          background-color: ${tint(euiTheme.colors.danger, 0.25)};
          color: ${euiTheme.colors.lightestShade};
        }
      `}
    `}
  `;
};
