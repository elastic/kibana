/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface TabularDataValue {
  formatted: string;
  raw: unknown;
}

export interface TabularDataColumn {
  name: string;
  field: string;
  filter?: (value: TabularDataValue) => void;
  filterOut?: (value: TabularDataValue) => void;
}

export type TabularDataRow = Record<TabularDataColumn['field'], TabularDataValue>;

export interface TabularData {
  columns: TabularDataColumn[];
  rows: TabularDataRow[];
}

export type TabularCallback = () => TabularData | Promise<TabularData>;

export interface TabularHolder {
  data: TabularData | null;
  options: TabularLoaderOptions;
}

export interface TabularLoaderOptions {
  returnsFormattedValues?: boolean;
}
