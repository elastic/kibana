/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Accessor, AccessorFn, GroupBy, SmallMultiples } from '@elastic/charts';
import { Predicate } from '@elastic/charts/dist/common/predicate';
import type { DatatableColumn, DatatableRow } from '../../../expressions/public';

interface ChartSplitterProps {
  splitColumnAccessor?: Accessor | AccessorFn;
  splitRowAccessor?: Accessor | AccessorFn;
  splitDimension?: DatatableColumn;
  visDataRows: DatatableRow[];
}

const CHART_SPLIT_ID = '__xy_chart_split__';

export const ChartSplit = ({
  splitColumnAccessor,
  splitRowAccessor,
  splitDimension,
  visDataRows,
}: ChartSplitterProps) => {
  if (!splitColumnAccessor && !splitRowAccessor) return null;

  return (
    <>
      <GroupBy
        id={CHART_SPLIT_ID}
        by={(spec, datum) => visDataRows.indexOf(datum)}
        sort={Predicate.DataIndex}
        format={
          splitDimension
            ? (dataIndex) => `${visDataRows[dataIndex as number][splitDimension.id]}`
            : undefined
        }
      />
      <SmallMultiples
        splitVertically={splitRowAccessor ? CHART_SPLIT_ID : undefined}
        splitHorizontally={splitColumnAccessor ? CHART_SPLIT_ID : undefined}
      />
    </>
  );
};
