/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Datatable } from '@kbn/expressions-plugin/common';
import { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
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

export interface LayerFieldFormats {
  xAccessors: AccessorsFieldFormats;
  yAccessors: AccessorsFieldFormats;
  splitSeriesAccessors: AccessorsFieldFormats;
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
}

export type LayersAccessorsTitles = Record<string, LayerAccessorsTitles>;

export function getFilteredLayers(layers: CommonXYLayerConfig[]) {
  return layers.filter<ReferenceLineLayerConfig | CommonXYDataLayerConfig>(
    (layer): layer is ReferenceLineLayerConfig | CommonXYDataLayerConfig => {
      let table: Datatable | undefined;
      let accessors: Array<ExpressionValueVisDimension | string> = [];
      let xAccessor: undefined | string | number;
      let splitAccessor: undefined | string | number;

      if (isDataLayer(layer) || isReferenceLayer(layer)) {
        table = layer.table;
        accessors = layer.accessors;
      }

      if (isDataLayer(layer)) {
        xAccessor =
          layer.xAccessor && table && getAccessorByDimension(layer.xAccessor, table.columns);
        splitAccessor =
          layer.splitAccessor &&
          table &&
          getAccessorByDimension(layer.splitAccessor, table.columns);
      }

      return !(
        !accessors.length ||
        !table ||
        table.rows.length === 0 ||
        (xAccessor &&
          table.rows.every((row) => xAccessor && typeof row[xAccessor] === 'undefined')) ||
        // stacked percentage bars have no xAccessors but splitAccessor with undefined values in them when empty
        (!xAccessor &&
          splitAccessor &&
          table.rows.every((row) => splitAccessor && typeof row[splitAccessor] === 'undefined'))
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
  { xAccessor, accessors, splitAccessor, table, isPercentage }: CommonXYDataLayerConfig,
  { splitColumnAccessor, splitRowAccessor }: SplitAccessors
): LayerFieldFormats => {
  const yAccessors: Array<string | ExpressionValueVisDimension> = accessors;
  return {
    xAccessors: getAccessorWithFieldFormat(xAccessor, table.columns),
    yAccessors: yAccessors.reduce(
      (formatters, a) => ({
        ...formatters,
        ...getYAccessorWithFieldFormat(a, table.columns, isPercentage),
      }),
      {}
    ),
    splitSeriesAccessors: getAccessorWithFieldFormat(splitAccessor, table.columns),
    splitColumnAccessors: getAccessorWithFieldFormat(splitColumnAccessor, table.columns),
    splitRowAccessors: getAccessorWithFieldFormat(splitRowAccessor, table.columns),
  };
};

export const getLayersFormats = (
  layers: CommonXYDataLayerConfig[],
  splitAccessors: SplitAccessors
): LayersFieldFormats =>
  layers.reduce<LayersFieldFormats>(
    (formatters, layer) => ({
      ...formatters,
      [layer.layerId]: getLayerFormats(layer, splitAccessors),
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

  return axisGroup?.title || column!.name;
};

export const getLayerTitles = (
  { xAccessor, accessors, splitAccessor, table, layerId }: CommonXYDataLayerConfig,
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

  const xColumnId = xAccessor && getAccessorByDimension(xAccessor, table.columns);
  const yColumnIds = accessors.map((a) => a && getAccessorByDimension(a, table.columns));

  return {
    xTitles: xTitle && xColumnId ? { [xColumnId]: xTitle } : mapTitle(xColumnId),
    yTitles: yColumnIds.reduce(
      (titles, yAccessor) => ({ ...titles, ...(yAccessor ? getYTitle(yAccessor) : {}) }),
      {}
    ),
    splitSeriesTitles: mapTitle(splitAccessor),
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
