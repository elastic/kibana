/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Accessor, AccessorFn, GroupBy, GroupBySort, SmallMultiples } from '@elastic/charts';
import { DatatableColumn } from '../../../expressions/public';

interface ChartSplitProps {
  splitColumnAccessor?: Accessor | AccessorFn;
  splitRowAccessor?: Accessor | AccessorFn;
  splitColumn?: DatatableColumn;
}

const CHART_SPLIT_ID = '__pie_chart_split__';
export const SMALL_MULTIPLES_ID = '__pie_chart_sm__';

export const ChartSplit = ({
  splitColumnAccessor,
  splitRowAccessor,
  splitColumn,
}: ChartSplitProps) => {
  if (!splitColumnAccessor && !splitRowAccessor) return null;
  let sort: GroupBySort = 'alphaDesc';
  if (splitColumn?.meta?.params?.id === 'terms') {
    sort = splitColumn?.meta?.sourceParams?.order === 'asc' ? 'alphaAsc' : 'alphaDesc';
  }

  return (
    <>
      <GroupBy
        id={CHART_SPLIT_ID}
        by={(spec, datum) => {
          const splitTypeAccessor = splitColumnAccessor || splitRowAccessor;
          if (splitTypeAccessor) {
            return typeof splitTypeAccessor === 'function'
              ? splitTypeAccessor(datum)
              : datum[splitTypeAccessor];
          }
          return spec.id;
        }}
        sort={sort}
      />
      <SmallMultiples
        id={SMALL_MULTIPLES_ID}
        splitVertically={splitRowAccessor ? CHART_SPLIT_ID : undefined}
        splitHorizontally={splitColumnAccessor ? CHART_SPLIT_ID : undefined}
        style={{
          verticalPanelPadding: {
            outer: 0.1,
            inner: 0.1,
          },
          horizontalPanelPadding: {
            outer: 0.1,
            inner: 0.1,
          },
        }}
      />
    </>
  );
};
