/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { startsWith } from 'lodash';
import { Datatable } from '@kbn/expressions-plugin';
import { CSV_FORMULA_CHARS } from './constants';

export const cellHasFormulas = (val: string) =>
  CSV_FORMULA_CHARS.some((formulaChar) => startsWith(val, formulaChar));

export const tableHasFormulas = (columns: Datatable['columns'], rows: Datatable['rows']) => {
  return (
    columns.some(({ name }) => cellHasFormulas(name)) ||
    rows.some((row) => columns.some(({ id }) => cellHasFormulas(row[id])))
  );
};
