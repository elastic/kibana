/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DatatableColumn, DatatableColumnMeta } from '@kbn/expressions-plugin/common';

type TextBasedColumnTypes = Record<string, DatatableColumnMeta>;

/**
 * Columns meta for text based searches
 * @param textBasedColumns
 */
export const getTextBasedColumnsMeta = (
  textBasedColumns: DatatableColumn[]
): TextBasedColumnTypes => {
  return textBasedColumns.reduce<TextBasedColumnTypes>((map, next) => {
    map[next.name] = next.meta;
    return map;
  }, {});
};
