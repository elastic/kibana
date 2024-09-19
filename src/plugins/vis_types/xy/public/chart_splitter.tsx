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

interface ChartSplitterProps {
  splitColumnAccessor?: Accessor | AccessorFn;
  splitRowAccessor?: Accessor | AccessorFn;
  splitDimension?: DatatableColumn;
}

interface SplitDimensionParams {
  order?: string;
  orderBy?: string;
}

const CHART_SPLITTER_ID = '__chart_splitter__';

export const ChartSplitter = ({
  splitColumnAccessor,
  splitRowAccessor,
  splitDimension,
}: ChartSplitterProps) => {
  let sort: GroupBySort = 'alphaDesc';
  if (splitDimension?.meta?.params?.id === 'terms') {
    const params = splitDimension?.meta?.sourceParams?.params as SplitDimensionParams;
    sort = params?.order === 'asc' ? 'alphaAsc' : 'alphaDesc';
  }
  return splitColumnAccessor || splitRowAccessor ? (
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
        sort={sort}
      />
      <SmallMultiples
        splitVertically={splitRowAccessor ? CHART_SPLITTER_ID : undefined}
        splitHorizontally={splitColumnAccessor ? CHART_SPLITTER_ID : undefined}
      />
    </>
  ) : null;
};
