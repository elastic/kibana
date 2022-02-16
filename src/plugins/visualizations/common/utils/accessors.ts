/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { Datatable, DatatableColumn } from '../../../expressions/common';
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
  if (typeof dimension === 'string') {
    return dimension;
  }

  const accessor = dimension.accessor;
  if (typeof accessor === 'number') {
    return columns[accessor].id;
  }

  return accessor.id;
};
