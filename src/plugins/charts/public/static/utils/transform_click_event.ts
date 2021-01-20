/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  XYChartSeriesIdentifier,
  GeometryValue,
  XYBrushArea,
  Accessor,
  AccessorFn,
  Datum,
} from '@elastic/charts';

import { RangeSelectContext, ValueClickContext } from '../../../../embeddable/public';
import { Datatable } from '../../../../expressions/public';

export interface ClickTriggerEvent {
  name: 'filterBucket';
  data: ValueClickContext['data'];
}

export interface BrushTriggerEvent {
  name: 'brush';
  data: RangeSelectContext['data'];
}

type AllSeriesAccessors = Array<[accessor: Accessor | AccessorFn, value: string | number]>;

/**
 * returns accessor value from string or function accessor
 * @param datum
 * @param accessor
 */
function getAccessorValue(datum: Datum, accessor: Accessor | AccessorFn) {
  if (typeof accessor === 'function') {
    return accessor(datum);
  }

  return datum[accessor];
}

/**
 * This is a little unorthodox, but using functional accessors makes it
 * difficult to match the correct column. This creates a test object to throw
 * an error when the target id is accessed, thus matcing the target column.
 */
function validateAccessorId(id: string, accessor: Accessor | AccessorFn) {
  if (typeof accessor !== 'function') {
    return id === accessor;
  }

  const matchedMessage = 'validateAccessorId matched';

  try {
    accessor({
      get [id]() {
        throw new Error(matchedMessage);
      },
    });
    return false;
  } catch ({ message }) {
    return message === matchedMessage;
  }
}

/**
 * Groups split accessors by their accessor string or function and related value
 *
 * @param splitAccessors
 * @param splitSeriesAccessorFnMap
 */
const getAllSplitAccessors = (
  splitAccessors: Map<string | number, string | number>,
  splitSeriesAccessorFnMap?: Map<string | number, AccessorFn>
): Array<[accessor: Accessor | AccessorFn, value: string | number]> =>
  [...splitAccessors.entries()].map(([key, value]) => [
    splitSeriesAccessorFnMap?.get?.(key) ?? key,
    value,
  ]);

/**
 * Reduces matching column indexes
 *
 * @param xAccessor
 * @param yAccessor
 * @param splitAccessors
 */
const columnReducer = (
  xAccessor: Accessor | AccessorFn | null,
  yAccessor: Accessor | AccessorFn | null,
  splitAccessors: AllSeriesAccessors
) => (
  acc: Array<[index: number, id: string]>,
  { id }: Datatable['columns'][number],
  index: number
): Array<[index: number, id: string]> => {
  if (
    (xAccessor !== null && validateAccessorId(id, xAccessor)) ||
    (yAccessor !== null && validateAccessorId(id, yAccessor)) ||
    splitAccessors.some(([accessor]) => validateAccessorId(id, accessor))
  ) {
    acc.push([index, id]);
  }

  return acc;
};

/**
 * Finds matching row index for given accessors and geometry values
 *
 * @param geometry
 * @param xAccessor
 * @param yAccessor
 * @param splitAccessors
 */
const rowFindPredicate = (
  geometry: GeometryValue | null,
  xAccessor: Accessor | AccessorFn | null,
  yAccessor: Accessor | AccessorFn | null,
  splitAccessors: AllSeriesAccessors
) => (row: Datatable['rows'][number]): boolean =>
  (geometry === null ||
    (xAccessor !== null &&
      getAccessorValue(row, xAccessor) === geometry.x &&
      yAccessor !== null &&
      getAccessorValue(row, yAccessor) === geometry.y)) &&
  [...splitAccessors].every(([accessor, value]) => getAccessorValue(row, accessor) === value);

/**
 * Helper function to transform `@elastic/charts` click event into filter action event
 *
 * @param table
 * @param xAccessor
 * @param splitSeriesAccessorFnMap needed when using `splitSeriesAccessors` as `AccessorFn`
 * @param negate
 */
export const getFilterFromChartClickEventFn = (
  table: Datatable,
  xAccessor: Accessor | AccessorFn,
  splitSeriesAccessorFnMap?: Map<string | number, AccessorFn>,
  negate: boolean = false
) => (points: Array<[GeometryValue, XYChartSeriesIdentifier]>): ClickTriggerEvent => {
  const data: ValueClickContext['data']['data'] = [];

  points.forEach((point) => {
    const [geometry, { yAccessor, splitAccessors }] = point;
    const allSplitAccessors = getAllSplitAccessors(splitAccessors, splitSeriesAccessorFnMap);
    const columns = table.columns.reduce<Array<[index: number, id: string]>>(
      columnReducer(xAccessor, yAccessor, allSplitAccessors),
      []
    );
    const row = table.rows.findIndex(
      rowFindPredicate(geometry, xAccessor, yAccessor, allSplitAccessors)
    );
    const newData = columns.map(([column, id]) => ({
      table,
      column,
      row,
      value: table.rows?.[row]?.[id] ?? null,
    }));

    data.push(...newData);
  });

  return {
    name: 'filterBucket',
    data: {
      negate,
      data,
    },
  };
};

/**
 * Helper function to get filter action event from series
 */
export const getFilterFromSeriesFn = (table: Datatable) => (
  { splitAccessors }: XYChartSeriesIdentifier,
  splitSeriesAccessorFnMap?: Map<string | number, AccessorFn>,
  negate = false
): ClickTriggerEvent => {
  const allSplitAccessors = getAllSplitAccessors(splitAccessors, splitSeriesAccessorFnMap);
  const columns = table.columns.reduce<Array<[index: number, id: string]>>(
    columnReducer(null, null, allSplitAccessors),
    []
  );
  const row = table.rows.findIndex(rowFindPredicate(null, null, null, allSplitAccessors));
  const data: ValueClickContext['data']['data'] = columns.map(([column, id]) => ({
    table,
    column,
    row,
    value: table.rows?.[row]?.[id] ?? null,
  }));

  return {
    name: 'filterBucket',
    data: {
      negate,
      data,
    },
  };
};

/**
 * Helper function to transform `@elastic/charts` brush event into brush action event
 */
export const getBrushFromChartBrushEventFn = (
  table: Datatable,
  xAccessor: Accessor | AccessorFn
) => ({ x: selectedRange }: XYBrushArea): BrushTriggerEvent => {
  const [start, end] = selectedRange ?? [0, 0];
  const range: [number, number] = [start, end];
  const column = table.columns.findIndex(({ id }) => validateAccessorId(id, xAccessor));

  return {
    data: {
      table,
      column,
      range,
    },
    name: 'brush',
  };
};
