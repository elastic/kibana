/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export interface Column {
  // -1 value can be in a fake X aspect
  id: string | -1;
  name: string;
}

export interface Row {
  [key: string]: number | string | object;
}

export interface TableParent {
  table: Table;
  tables?: Table[];
  column: number;
  row: number;
  key: number;
  formattedKey: string;
  name: string;
}
export interface Table {
  columns: Column[];
  rows: Row[];
  $parent?: TableParent;
}
