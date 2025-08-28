/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiBadge } from '@elastic/eui';
import type { DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';
import type { FieldFormatConvertFunction } from '@kbn/field-formats-plugin/common';
import type { VisParams } from '@kbn/visualizations-plugin/common/types';

import type { FormatOverrides } from './helpers';
import { getSecondaryMetricInfo } from './secondary_metric_info';
import type { TrendConfig } from './secondary_metric_info';

export interface SecondaryMetricProps {
  columns: DatatableColumn[];
  row: DatatableRow;
  config: Pick<VisParams, 'metric' | 'dimensions'>;
  trendConfig?: TrendConfig;
  staticColor?: string;
  getMetricFormatter: (
    accessor: string,
    columns: DatatableColumn[],
    formatOverrides?: FormatOverrides | undefined
  ) => FieldFormatConvertFunction;
}

export function SecondaryMetric({
  columns,
  row,
  config,
  getMetricFormatter,
  trendConfig,
  staticColor,
}: SecondaryMetricProps) {
  const secondaryMetricInfo = getSecondaryMetricInfo({
    columns,
    row,
    config,
    getMetricFormatter,
    trendConfig,
    staticColor,
  });

  const badgeCss = [
    styles.badge,
    trendConfig?.borderColor ? css({ border: `1px solid ${trendConfig.borderColor}` }) : undefined,
  ];

  return (
    <span css={styles.wrapper} data-test-subj="metric-secondary-element">
      {secondaryMetricInfo.label && <span css={[styles.label]}>{secondaryMetricInfo.label}</span>}
      <span css={styles.value}>
        {secondaryMetricInfo.badgeColor ? (
          <EuiBadge
            color={secondaryMetricInfo.badgeColor}
            aria-label={secondaryMetricInfo.description}
            css={badgeCss}
            data-test-subj="expressionMetricVis-secondaryMetric-badge"
          >
            {secondaryMetricInfo.value}
          </EuiBadge>
        ) : (
          <span aria-label={secondaryMetricInfo.description}>{secondaryMetricInfo.value}</span>
        )}
      </span>
    </span>
  );
}

const styles = {
  wrapper: css({
    display: 'flex',
    alignItems: 'center',
    minWidth: 0,
    width: '100%',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  }),
  label: css({
    flex: '0 1 auto',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  value: css({
    display: 'inline-flex',
    flex: '1 0 auto',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
    marginLeft: 4,
    maxWidth: 'calc(100% - 4px)', // Subtract the marginLeft value
  }),
  badge: () => css`
    font-size: inherit;
    line-height: inherit;
  `,
};
