/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo } from 'react';
import type { FC } from 'react';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { DataGridDensity, getDataGridDensityPadding } from '@kbn/unified-data-table';
import { mathWithUnits, useEuiTheme } from '@elastic/eui';
import { SparklineChart } from './sparkline_chart';
import type { ProfileProviderServices } from '../../profile_provider_services';

interface SparklineRendererProps {
  charts: ChartsPluginStart;
  values: unknown;
}

const isNumberArray = (values: unknown): values is number[] =>
  Array.isArray(values) && values.every((item) => typeof item === 'number');

export const SparklineRenderer: FC<SparklineRendererProps> = ({ charts, values }) => {
  const typedValues = useMemo(() => (isNumberArray(values) ? values : undefined), [values]);
  return typedValues === undefined ? '-' : <SparklineChart charts={charts} values={typedValues} />;
};

export const SparklineCellRenderer: FC<
  DataGridCellValueElementProps & {
    services: ProfileProviderServices;
    density: DataGridDensity | undefined;
  }
> = ({ services, row, columnId, density, setCellProps }) => {
  const { euiTheme } = useEuiTheme();
  const cellPadding = getDataGridDensityPadding(euiTheme, density ?? DataGridDensity.COMPACT);
  const fallbackHeight = useMemo(
    () => mathWithUnits(euiTheme.size.l, (l) => l * 2),
    [euiTheme.size.l]
  );

  useEffect(() => {
    setCellProps({
      css: {
        '.euiDataGridRowCell__content': {
          overflow: 'visible',
        },
      },
    });
  }, [cellPadding, setCellProps]);

  return (
    <>
      <div css={{ minHeight: fallbackHeight }} />
      <div css={{ position: 'absolute', inset: cellPadding }}>
        <SparklineRenderer charts={services.charts} values={row.flattened[columnId]} />
      </div>
    </>
  );
};
