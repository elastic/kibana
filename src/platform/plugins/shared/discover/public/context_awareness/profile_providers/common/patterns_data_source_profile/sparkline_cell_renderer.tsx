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
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { SparklineChart } from './sparkline_chart';
import { useContainerStyle } from './use_container_style';

interface Props {
  charts: ChartsPluginStart;
  values: number[];
  isDetails: boolean;
  defaultRowHeight?: number;
}

export const SparklineCellRenderer: FC<Props> = ({
  charts,
  values,
  isDetails,
  defaultRowHeight,
}) => {
  const containerStyle = useContainerStyle(defaultRowHeight);

  return (
    <div css={containerStyle}>
      <SparklineChart charts={charts} values={values} rowHeight={defaultRowHeight ?? 1} />
    </div>
  );
};

export function getSparklineCellRenderer(
  charts: ChartsPluginStart,
  values: unknown,
  isDetails: boolean,
  defaultRowHeight?: number
) {
  if (values === undefined) {
    return '-';
  }
  return (
    <SparklineCellRenderer
      charts={charts}
      values={values as number[]}
      isDetails={isDetails}
      defaultRowHeight={defaultRowHeight}
    />
  );
}
