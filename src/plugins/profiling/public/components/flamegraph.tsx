/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useEffect, useMemo } from 'react';

import { Chart, Partition, PartitionLayout, PrimitiveValue, Settings } from '@elastic/charts';

import { EuiSpacer } from '@elastic/eui';

import { FlameGraphContext } from './contexts/flamegraph';

export interface FlameGraphProps {
  id: string;
  height: number;
}

export const FlameGraph: React.FC<FlameGraphProps> = ({ id, height }) => {
  const ctx = useContext(FlameGraphContext);

  useEffect(() => {
    console.log(new Date().toISOString(), 'updated flamegraph');
  });

  const layers = useMemo(() => {
    if (!ctx || !ctx.leaves || !ctx.leaves.length) {
      return [];
    }

    const { leaves } = ctx;
    const maxDepth = Math.max(...leaves.map((node) => node.depth));

    const result = [...new Array(maxDepth)].map((_, depth) => {
      return {
        groupByRollup: (d: any) => d.pathFromRoot[depth],
        nodeLabel: (label: PrimitiveValue) => label,
        showAccessor: (n: PrimitiveValue) => !!n,
        shape: {
          fillColor: (d: any) => '#FD8484',
        },
      };
    });

    return result;
  }, [ctx]);

  return (
    <>
      <EuiSpacer />
      <Chart size={['100%', height]}>
        <Settings />
        <Partition
          id={id}
          data={ctx.leaves}
          layers={layers}
          drilldown
          maxRowCount={1}
          layout={PartitionLayout.icicle}
          valueAccessor={(d: any) => d.value as number}
          valueFormatter={() => ''}
        />
      </Chart>
    </>
  );
};
