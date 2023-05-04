/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Datatable } from '@kbn/expressions-plugin/common';
import {
  FieldFormat,
  FormatFactory,
  SerializedFieldFormat,
} from '@kbn/field-formats-plugin/common';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common/expression_functions';
import {
  getAccessorByDimension,
  getColumnByAccessor,
} from '@kbn/visualizations-plugin/common/utils';
import {
  CommonXYDataLayerConfig,
  CommonXYLayerConfig,
  ReferenceLineLayerConfig,
} from '../../common/types';
import { GroupsConfiguration } from './axes_configuration';
import { getFormat } from './format';
import { isDataLayer, isReferenceLayer } from './visualization';

interface CustomTitles {
  xTitle?: string;
  yTitle?: string;
  yRightTitle?: string;
}

interface SplitAccessors {
  splitColumnAccessor?: string | ExpressionValueVisDimension;
  splitRowAccessor?: string | ExpressionValueVisDimension;
}

export type AccessorsFieldFormats = Record<string, SerializedFieldFormat | undefined>;
export type SplitAccessorsFieldFormats = Record<
  string,
  { format: SerializedFieldFormat | undefined; formatter: FieldFormat }
>;

export interface LayerFieldFormats {
  xAccessors: AccessorsFieldFormats;
  yAccessors: AccessorsFieldFormats;
  splitSeriesAccessors: SplitAccessorsFieldFormats;
  splitColumnAccessors: AccessorsFieldFormats;
  splitRowAccessors: AccessorsFieldFormats;
}

export type LayersFieldFormats = Record<string, LayerFieldFormats>;

export type AccessorsTitles = Record<string, string>;

export interface LayerAccessorsTitles {
  xTitles?: AccessorsTitles;
  yTitles?: AccessorsTitles;
  splitSeriesTitles?: AccessorsTitles;
  splitColumnTitles?: AccessorsTitles;
  splitRowTitles?: AccessorsTitles;
  markSizeTitles?: AccessorsTitles;
}

export type LayersAccessorsTitles = Record<string, LayerAccessorsTitles>;

export function getFilteredLayers(layers: CommonXYLayerConfig[]) {
  return layers.filter<ReferenceLineLayerConfig | CommonXYDataLayerConfig>(
    (layer): layer is ReferenceLineLayerConfig | CommonXYDataLayerConfig => {
      let table: Datatable | undefined;
      let accessors: Array<ExpressionValueVisDimension | string> = [];
      let xAccessor: undefined | string | number;
      let splitAccessors: string[] = [];

      if (isDataLayer(layer) || isReferenceLayer(layer)) {
        table = layer.table;
        accessors = layer.accessors;
      }

      if (isDataLayer(layer)) {
        xAccessor =
          layer.xAccessor !== undefined && table
            ? getAccessorByDimension(layer.xAccessor, table.columns)
            : undefined;
        splitAccessors = table
          ? layer.splitAccessors?.map((splitAccessor) =>
              getAccessorByDimension(splitAccessor, table!.columns)
            ) || []
          : [];
      }

      return !(
        !accessors.length ||
        !table ||
        table.rows.length === 0 ||
        (xAccessor && table.rows.every((row) => xAccessor && row[xAccessor] === undefined)) ||
        // stacked percentage bars have no xAccessors but splitAccessor with undefined values in them when empty
        (!xAccessor &&
          splitAccessors.length &&
          table.rows.every((row) =>
            splitAccessors.every((splitAccessor) => row[splitAccessor] === undefined)
          ))
      );
    }
  );
}

const getAccessorWithFieldFormat = (
  dimension: string | ExpressionValueVisDimension | undefined,
  columns: Datatable['columns']
) => {
  if (!dimension) {
    return {};
  }

  const accessor = getAccessorByDimension(dimension, columns);
  return { [accessor]: getFormat(columns, dimension) };
};

const getYAccessorWithFieldFormat = (
  dimension: string | ExpressionValueVisDimension | undefined,
  columns: Datatable['columns'],
  isPercentage: boolean
) => {
  if (!dimension) {
    return {};
  }

  const accessor = getAccessorByDimension(dimension, columns);
  let format = getFormat(columns, dimension) ?? { id: 'number' };
  if (format?.id !== 'percent' && isPercentage) {
    format = { id: 'percent', params: { pattern: '0.[00]%' } };
  }

  return { [accessor]: format };
};

export const getLayerFormats = (
  { xAccessor, accessors, splitAccessors = [], table, isPercentage }: CommonXYDataLayerConfig,
  { splitColumnAccessor, splitRowAccessor }: SplitAccessors,
  formatFactory: FormatFactory
): LayerFieldFormats => {
  const yAccessors: Array<string | ExpressionValueVisDimension> = accessors;
  const splitColumnAccessors: Array<string | ExpressionValueVisDimension> = splitAccessors;
  return {
    xAccessors: getAccessorWithFieldFormat(xAccessor, table.columns),
    yAccessors: yAccessors.reduce(
      (formatters, a) => ({
        ...formatters,
        ...getYAccessorWithFieldFormat(a, table.columns, isPercentage),
      }),
      {}
    ),
    splitSeriesAccessors: splitColumnAccessors?.reduce((formatters, splitAccessor) => {
      const formatObj = getAccessorWithFieldFormat(splitAccessor, table.columns);
      const accessor = Object.keys(formatObj)[0];
      return {
        ...formatters,
        [accessor]: {
          format: formatObj[accessor],
          formatter: formatFactory(formatObj[accessor]),
        },
      };
    }, {}),
    splitColumnAccessors: getAccessorWithFieldFormat(splitColumnAccessor, table.columns),
    splitRowAccessors: getAccessorWithFieldFormat(splitRowAccessor, table.columns),
  };
};

export const getLayersFormats = (
  layers: CommonXYDataLayerConfig[],
  splitAccessors: SplitAccessors,
  formatFactory: FormatFactory
): LayersFieldFormats =>
  layers.reduce<LayersFieldFormats>(
    (formatters, layer) => ({
      ...formatters,
      [layer.layerId]: getLayerFormats(layer, splitAccessors, formatFactory),
    }),
    {}
  );

const getTitleForYAccessor = (
  layerId: string,
  yAccessor: string | ExpressionValueVisDimension,
  groups: GroupsConfiguration,
  columns: Datatable['columns']
) => {
  const column = getColumnByAccessor(yAccessor, columns);
  const axisGroup = groups.find((group) =>
    group.series.some(({ accessor, layer }) => accessor === yAccessor && layer === layerId)
  );

  return column?.name ?? axisGroup?.title;
};

export const getLayerTitles = (
  {
    xAccessor,
    accessors,
    splitAccessors = [],
    table,
    layerId,
    markSizeAccessor,
  }: CommonXYDataLayerConfig,
  { splitColumnAccessor, splitRowAccessor }: SplitAccessors,
  { xTitle }: CustomTitles,
  groups: GroupsConfiguration
): LayerAccessorsTitles => {
  const mapTitle = (dimension?: string | ExpressionValueVisDimension) => {
    if (!dimension) {
      return {};
    }

    const column = getColumnByAccessor(dimension, table.columns);
    return { [column!.id]: column!.name };
  };

  const getYTitle = (accessor: string) => ({
    [accessor]: getTitleForYAccessor(layerId, accessor, groups, table.columns),
  });

  const xColumnId = xAccessor ? getAccessorByDimension(xAccessor, table.columns) : undefined;
  const yColumnIds = accessors.map((a) => getAccessorByDimension(a, table.columns));
  const splitColumnAccessors: Array<string | ExpressionValueVisDimension> = splitAccessors;

  return {
    xTitles: xTitle && xColumnId ? { [xColumnId]: xTitle } : mapTitle(xColumnId),
    yTitles: yColumnIds.reduce(
      (titles, yAccessor) => ({ ...titles, ...(yAccessor ? getYTitle(yAccessor) : {}) }),
      {}
    ),
    splitSeriesTitles: splitColumnAccessors.reduce(
      (titles, splitAccessor) => ({
        ...titles,
        ...(splitAccessor ? mapTitle(splitAccessor) : {}),
      }),
      {}
    ),
    markSizeTitles: mapTitle(markSizeAccessor),
    splitColumnTitles: mapTitle(splitColumnAccessor),
    splitRowTitles: mapTitle(splitRowAccessor),
  };
};

export const getLayersTitles = (
  layers: CommonXYDataLayerConfig[],
  splitAccessors: SplitAccessors,
  customTitles: CustomTitles,
  groups: GroupsConfiguration
): LayersAccessorsTitles =>
  layers.reduce<LayersAccessorsTitles>(
    (formatters, layer) => ({
      ...formatters,
      [layer.layerId]: getLayerTitles(layer, splitAccessors, customTitles, groups),
    }),
    {}
  );
