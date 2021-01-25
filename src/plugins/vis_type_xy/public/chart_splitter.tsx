/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { Accessor, AccessorFn, GroupBy, GroupBySort, SmallMultiples } from '@elastic/charts';

interface ChartSplitterProps {
  splitColumnAccessor?: Accessor | AccessorFn;
  splitRowAccessor?: Accessor | AccessorFn;
  sort?: GroupBySort;
}

const CHART_SPLITTER_ID = '__chart_splitter__';

export const ChartSplitter = ({
  splitColumnAccessor,
  splitRowAccessor,
  sort,
}: ChartSplitterProps) =>
  splitColumnAccessor || splitRowAccessor ? (
    <>
      <GroupBy
        id={CHART_SPLITTER_ID}
        by={(spec, datum) => {
          const splitTypeAccessor = splitColumnAccessor || splitRowAccessor;
          if (splitTypeAccessor) {
            return typeof splitTypeAccessor === 'function'
              ? splitTypeAccessor(datum)
              : datum[splitTypeAccessor];
          }
          return spec.id;
        }}
        sort={sort || 'dataIndex'}
      />
      <SmallMultiples
        splitVertically={splitRowAccessor ? CHART_SPLITTER_ID : undefined}
        splitHorizontally={splitColumnAccessor ? CHART_SPLITTER_ID : undefined}
      />
    </>
  ) : null;
