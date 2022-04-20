/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import { ExpressionValueVisDimension } from '../expression_functions';

const getAccessorByIndex = (accessor: number, columns: Datatable['columns']) =>
  columns.length > accessor ? accessor : undefined;

const getAccessorById = (accessor: DatatableColumn['id'], columns: Datatable['columns']) =>
  columns.find((c) => c.id === accessor);

export const findAccessorOrFail = (accessor: string | number, columns: DatatableColumn[]) => {
  const foundAccessor =
    typeof accessor === 'number'
      ? getAccessorByIndex(accessor, columns)
      : getAccessorById(accessor, columns);

  if (foundAccessor === undefined) {
    throw new Error(
      i18n.translate('visualizations.function.findAccessorOrFail.error.accessor', {
        defaultMessage: 'Provided column name or index is invalid: {accessor}',
        values: { accessor },
      })
    );
  }

  return foundAccessor;
};

export const getAccessorByDimension = (
  dimension: string | ExpressionValueVisDimension,
  columns: DatatableColumn[]
) => {
  if (!isVisDimension(dimension)) {
    return dimension;
  }

  const accessor = dimension.accessor;
  if (typeof accessor === 'number') {
    return columns[accessor].id;
  }

  return accessor.id;
};

// we don't need validate ExpressionValueVisDimension type because
// it was already had validation inside `vis_dimenstion` expression function
export const validateAccessor = (
  accessor: string | ExpressionValueVisDimension | undefined,
  columns: DatatableColumn[]
) => {
  if (accessor && typeof accessor === 'string') {
    findAccessorOrFail(accessor, columns);
  }
};

export function getAccessor(dimension: string | ExpressionValueVisDimension) {
  return typeof dimension === 'string' ? dimension : dimension.accessor;
}

export function getFormatByAccessor(
  dimension: string | ExpressionValueVisDimension,
  columns: DatatableColumn[]
) {
  return typeof dimension === 'string'
    ? getColumnByAccessor(dimension, columns)?.meta.params
    : dimension.format;
}

export const getColumnByAccessor = (
  accessor: ExpressionValueVisDimension | string,
  columns: Datatable['columns'] = []
) => {
  if (typeof accessor === 'string') {
    return columns.find(({ id }) => accessor === id);
  }

  const visDimensionAccessor = accessor.accessor;
  if (typeof visDimensionAccessor === 'number') {
    return columns[visDimensionAccessor];
  }

  return columns.find(({ id }) => visDimensionAccessor.id === id);
};

export function isVisDimension(
  accessor: string | ExpressionValueVisDimension | undefined
): accessor is ExpressionValueVisDimension {
  if (typeof accessor === 'string' || accessor === undefined) {
    return false;
  }

  return true;
}
