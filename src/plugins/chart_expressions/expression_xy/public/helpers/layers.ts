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
  getFormatByAccessor,
} from '@kbn/visualizations-plugin/common/utils';
import {
  CommonXYDataLayerConfig,
  CommonXYLayerConfig,
  CommonXYReferenceLineLayerConfig,
  SeriesType,
} from '../../common/types';
import { GroupsConfiguration } from './axes_configuration';
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
  xTitles: AccessorsTitles;
  yTitles: AccessorsTitles;
  splitSeriesTitles: AccessorsTitles;
  splitColumnTitles: AccessorsTitles;
  splitRowTitles: AccessorsTitles;
}

export type LayersAccessorsTitles = Record<string, LayerAccessorsTitles>;

export function getFilteredLayers(layers: CommonXYLayerConfig[]) {
  return layers.filter<CommonXYReferenceLineLayerConfig | CommonXYDataLayerConfig>(
    (layer): layer is CommonXYReferenceLineLayerConfig | CommonXYDataLayerConfig => {
      let table: Datatable | undefined;
      let accessors: string[] = [];
      let xAccessor: undefined | string | number;
      let splitAccessor: undefined | string | number;

      if (isDataLayer(layer)) {
        xAccessor = layer.xAccessor;
        splitAccessor = layer.splitAccessor;
      }

      if (isDataLayer(layer) || isReferenceLayer(layer)) {
        table = layer.table;
        accessors = layer.accessors;
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
  return { [accessor]: getFormatByAccessor(accessor, columns) };
};

const getYAccessorWithFieldFormat = (
  dimension: string | ExpressionValueVisDimension | undefined,
  columns: Datatable['columns'],
  seriesType: SeriesType
) => {
  if (!dimension) {
    return {};
  }

  const accessor = getAccessorByDimension(dimension, columns);
  let format = getFormatByAccessor(accessor, columns);
  if (format?.id !== 'percent' && seriesType.includes('percentage')) {
    format = { id: 'percent', params: { pattern: '0.[00]%' } };
  }

  return { [accessor]: format };
};

export const getLayerFormats = (
  { xAccessor, accessors, splitAccessor, table, seriesType }: CommonXYDataLayerConfig,
  { splitColumnAccessor, splitRowAccessor }: SplitAccessors
): LayerFieldFormats => ({
  xAccessors: getAccessorWithFieldFormat(xAccessor, table.columns),
  yAccessors: accessors.reduce(
    (formatters, a) => ({
      ...formatters,
      ...getYAccessorWithFieldFormat(a, table.columns, seriesType),
    }),
    {}
  ),
  splitSeriesAccessors: getAccessorWithFieldFormat(splitAccessor, table.columns),
  splitColumnAccessors: getAccessorWithFieldFormat(splitColumnAccessor, table.columns),
  splitRowAccessors: getAccessorWithFieldFormat(splitRowAccessor, table.columns),
});

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
  { yTitle, yRightTitle }: Omit<CustomTitles, 'xTitle'>,
  groups: GroupsConfiguration,
  columns: Datatable['columns']
) => {
  const column = getColumnByAccessor(yAccessor, columns);
  const isRight = groups.some((group) =>
    group.series.some(
      ({ accessor, layer }) =>
        accessor === yAccessor && layer === layerId && group.groupId === 'right'
    )
  );
  if (isRight) {
    return yRightTitle || column!.name;
  }

  return yTitle || column!.name;
};

export const getLayerTitles = (
  { xAccessor, accessors, splitAccessor, table, layerId }: CommonXYDataLayerConfig,
  { splitColumnAccessor, splitRowAccessor }: SplitAccessors,
  { xTitle, yTitle, yRightTitle }: CustomTitles,
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
    [accessor]: getTitleForYAccessor(
      layerId,
      accessor,
      { yTitle, yRightTitle },
      groups,
      table.columns
    ),
  });

  return {
    xTitles: xTitle && xAccessor ? { [xAccessor]: xTitle } : mapTitle(xAccessor),
    yTitles: accessors.reduce(
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
