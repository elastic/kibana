/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { difference, intersection } from 'lodash';

interface GetRenderedColumnsParams {
  /** All column names currently available, in their canonical order. */
  currentColumnNames: string[];
  /** Column names the user has chosen to display, in display order. */
  activeColumns: string[];
  /**
   * Column names the grid has already accounted for. Columns absent from this set are revealed
   * automatically (newly added fields and placeholder columns); columns present in it stay hidden
   * when they are not active, so previously revealed fields can be toggled off again.
   */
  seenColumnNames: ReadonlySet<string>;
}

/**
 * Computes the ordered list of columns to render: the active columns in their chosen order, plus
 * any not-yet-seen columns inserted at their canonical index.
 */
export const getRenderedColumns = ({
  currentColumnNames,
  activeColumns,
  seenColumnNames,
}: GetRenderedColumnsParams): string[] => {
  // Order the columns based on the active columns, dropping any that no longer exist.
  const preservedOrder = intersection(activeColumns, currentColumnNames);

  // Reveal columns the grid has not seen yet at their canonical index.
  const newColumns = difference(currentColumnNames, preservedOrder).filter(
    (name) => !seenColumnNames.has(name)
  );

  newColumns.forEach((newColumn) => {
    const newColumnIndex = currentColumnNames.findIndex((col) => col === newColumn);
    preservedOrder.splice(newColumnIndex, 0, newColumn);
  });

  return preservedOrder;
};
