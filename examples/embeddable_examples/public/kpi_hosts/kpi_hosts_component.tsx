/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';
import { euiPalettePositive } from '@elastic/eui';
import { Chart, Settings, Axis, LineSeries, BarSeries, DataGenerator } from '@elastic/charts';
import { withEmbeddableSubscription, EmbeddableOutput } from '@kbn/embeddable-plugin/public';
import { KpiHostsEmbeddable, KpiHostsInput } from './kpi_hosts_embeddable';

interface Props {
  embeddable: KpiHostsEmbeddable;
  input: KpiHostsInput;
  output: EmbeddableOutput;
}

export function KpiHostsComponentInner({ input: { icon, title, task, search } }: Props) {
  const customColors = {
    colors: {
      vizColors: euiPalettePositive(5),
    },
  };

  /**
   * Create data
   */
  const dg = new DataGenerator();
  const data1 = dg.generateGroupedSeries(20, 1);
  const data2 = dg.generateGroupedSeries(20, 5);

  return (
    <Fragment>
      <Chart size={{ height: 200 }}>
        <Settings theme={[customColors]} />
        <BarSeries
          id="status"
          name="Status"
          data={data2}
          xAccessor={'x'}
          yAccessors={['y']}
          splitSeriesAccessors={['g']}
          stackAccessors={['g']}
        />
        <LineSeries
          id="control"
          name="Control"
          data={data1}
          xAccessor={'x'}
          yAccessors={['y']}
          color={['black']}
        />
        <Axis id="bottom-axis" position="bottom" showGridLines />
        <Axis
          id="left-axis"
          position="left"
          showGridLines
          tickFormat={(d) => Number(d).toFixed(2)}
        />
      </Chart>
    </Fragment>
  );
}

export const KpiHostsEmbeddableComponent = withEmbeddableSubscription<
  KpiHostsInput,
  EmbeddableOutput,
  KpiHostsEmbeddable
>(KpiHostsComponentInner);
