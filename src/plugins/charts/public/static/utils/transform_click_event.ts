/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
import { Datatable } from '../../../../expressions/common/expression_types/specs';

export interface ClickTriggerEvent {
  name: 'filterBucket';
  data: ValueClickContext['data'];
}

export interface BrushTriggerEvent {
  name: 'brush';
  data: RangeSelectContext['data'];
}

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
function validateFnAccessorId(id: string, accessor: AccessorFn) {
  const matchedMessage = 'validateFnAccessorId matched';

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
 * Helper function to transform `@elastic/charts` click event into filter action event
 */
export const getFilterFromChartClickEventFn = (
  table: Datatable,
  xAccessor: Accessor | AccessorFn,
  negate: boolean = false
) => (points: Array<[GeometryValue, XYChartSeriesIdentifier]>): ClickTriggerEvent => {
  const data: ValueClickContext['data']['data'] = [];
  const seenKeys = new Set<string>();

  points.forEach((point) => {
    const [geometry, { yAccessor, splitAccessors }] = point;
    const columnIndices = table.columns.reduce<number[]>((acc, { id }, index) => {
      if (
        (typeof xAccessor === 'function' && validateFnAccessorId(id, xAccessor)) ||
        [xAccessor, yAccessor, ...splitAccessors.keys()].includes(id)
      ) {
        acc.push(index);
      }

      return acc;
    }, []);

    const rowIndex = table.rows.findIndex((row) => {
      return (
        getAccessorValue(row, xAccessor) === geometry.x &&
        row[yAccessor] === geometry.y &&
        [...splitAccessors.entries()].every(([key, value]) => row[key] === value)
      );
    });

    data.push(
      ...columnIndices
        .map((column) => ({
          table,
          column,
          row: rowIndex,
          value: null,
        }))
        .filter((column) => {
          // filter duplicate values when multiple geoms are highlighted
          const key = `column:${column},row:${rowIndex}`;
          if (seenKeys.has(key)) {
            return false;
          }

          seenKeys.add(key);

          return true;
        })
    );
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
  negate = false
): ClickTriggerEvent => {
  const data = table.columns.reduce<ValueClickContext['data']['data']>((acc, { id }, column) => {
    if ([...splitAccessors.keys()].includes(id)) {
      const value = splitAccessors.get(id);
      const row = table.rows.findIndex((r) => r[id] === value);
      acc.push({
        table,
        column,
        row,
        value,
      });
    }

    return acc;
  }, []);

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
  const column = table.columns.findIndex((c) => c.id === xAccessor);

  return {
    data: {
      table,
      column,
      range,
    },
    name: 'brush',
  };
};
