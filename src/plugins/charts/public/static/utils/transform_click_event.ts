/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  XYChartSeriesIdentifier,
  GeometryValue,
  XYBrushEvent,
  Accessor,
  AccessorFn,
  Datum,
} from '@elastic/charts';

import { RangeSelectContext, ValueClickContext } from '@kbn/embeddable-plugin/public';
import { Datatable } from '@kbn/expressions-plugin/public';

export interface ClickTriggerEvent {
  name: 'filterBucket';
  data: ValueClickContext['data'];
}

export interface BrushTriggerEvent {
  name: 'brush';
  data: RangeSelectContext['data'];
}

type AllSeriesAccessors<D = any> = Array<
  [accessor: Accessor<D> | AccessorFn<D>, value: string | number]
>;

/**
 * returns accessor value from string or function accessor
 * @param datum
 * @param accessor
 */
function getAccessorValue<D>(datum: D, accessor: Accessor<D> | AccessorFn<D>) {
  if (typeof accessor === 'function') {
    return accessor(datum);
  }

  return (datum as Datum)[accessor];
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
 * Gets value from small multiple accessors
 *
 * Only handles single small multiple accessor
 */
function getSplitChartValue({
  smHorizontalAccessorValue,
  smVerticalAccessorValue,
}: Pick<XYChartSeriesIdentifier, 'smHorizontalAccessorValue' | 'smVerticalAccessorValue'>):
  | string
  | number
  | undefined {
  if (smHorizontalAccessorValue !== undefined) {
    return smHorizontalAccessorValue;
  }

  if (smVerticalAccessorValue !== undefined) {
    return smVerticalAccessorValue;
  }

  return;
}

/**
 * Reduces matching column indexes
 *
 * @param xAccessor
 * @param yAccessor
 * @param splitAccessors
 */
const columnReducer =
  (
    xAccessor: Accessor | AccessorFn | null,
    yAccessor: Accessor | AccessorFn | null,
    splitAccessors: AllSeriesAccessors,
    splitChartAccessor?: Accessor | AccessorFn
  ) =>
  (
    acc: Array<[index: number, id: string]>,
    { id }: Datatable['columns'][number],
    index: number
  ): Array<[index: number, id: string]> => {
    if (
      (xAccessor !== null && validateAccessorId(id, xAccessor)) ||
      (yAccessor !== null && validateAccessorId(id, yAccessor)) ||
      (splitChartAccessor !== undefined && validateAccessorId(id, splitChartAccessor)) ||
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
const rowFindPredicate =
  (
    geometry: GeometryValue | null,
    xAccessor: Accessor | AccessorFn | null,
    yAccessor: Accessor | AccessorFn | null,
    splitAccessors: AllSeriesAccessors,
    splitChartAccessor?: Accessor | AccessorFn,
    splitChartValue?: string | number
  ) =>
  (row: Datatable['rows'][number]): boolean =>
    (geometry === null ||
      (xAccessor !== null &&
        getAccessorValue(row, xAccessor) === getAccessorValue(geometry.datum, xAccessor) &&
        yAccessor !== null &&
        getAccessorValue(row, yAccessor) === getAccessorValue(geometry.datum, yAccessor) &&
        (splitChartAccessor === undefined ||
          (splitChartValue !== undefined &&
            getAccessorValue(row, splitChartAccessor) === splitChartValue)))) &&
    [...splitAccessors].every(([accessor, value]) => getAccessorValue(row, accessor) === value);

/**
 * Helper function to transform `@elastic/charts` click event into filter action event
 *
 * @param table
 * @param xAccessor
 * @param splitSeriesAccessorFnMap needed when using `splitSeriesAccessors` as `AccessorFn`
 * @param negate
 */
export const getFilterFromChartClickEventFn =
  (
    table: Datatable,
    xAccessor: Accessor | AccessorFn,
    splitSeriesAccessorFnMap?: Map<string | number, AccessorFn>,
    splitChartAccessor?: Accessor | AccessorFn,
    negate: boolean = false
  ) =>
  (points: Array<[GeometryValue, XYChartSeriesIdentifier]>): ClickTriggerEvent => {
    const data: ValueClickContext['data']['data'] = [];

    points.forEach((point) => {
      const [geometry, { yAccessor, splitAccessors }] = point;
      const splitChartValue = getSplitChartValue(point[1]);
      const allSplitAccessors = getAllSplitAccessors(splitAccessors, splitSeriesAccessorFnMap);
      const columns = table.columns.reduce<Array<[index: number, id: string]>>(
        columnReducer(xAccessor, yAccessor, allSplitAccessors, splitChartAccessor),
        []
      );
      const row = table.rows.findIndex(
        rowFindPredicate(
          geometry,
          xAccessor,
          yAccessor,
          allSplitAccessors,
          splitChartAccessor,
          splitChartValue
        )
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
export const getFilterFromSeriesFn =
  (table: Datatable) =>
  (
    { splitAccessors, ...rest }: XYChartSeriesIdentifier,
    splitSeriesAccessorFnMap?: Map<string | number, AccessorFn>,
    splitChartAccessor?: Accessor | AccessorFn,
    negate = false
  ): ClickTriggerEvent => {
    const splitChartValue = getSplitChartValue(rest);
    const allSplitAccessors = getAllSplitAccessors(splitAccessors, splitSeriesAccessorFnMap);
    const columns = table.columns.reduce<Array<[index: number, id: string]>>(
      columnReducer(null, null, allSplitAccessors, splitChartAccessor),
      []
    );
    const row = table.rows.findIndex(
      rowFindPredicate(null, null, null, allSplitAccessors, splitChartAccessor, splitChartValue)
    );
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
export function getBrushFromChartBrushEventFn<D = never>(
  table: Datatable,
  xAccessor: Accessor<D> | AccessorFn<D>
) {
  return ({ x: selectedRange }: XYBrushEvent): BrushTriggerEvent => {
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
}
