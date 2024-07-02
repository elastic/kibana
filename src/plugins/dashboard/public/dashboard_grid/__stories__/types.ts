/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface GridLayout {
  [key: string]: GridData;
}

export interface GridData {
  id: string;
  column: number;
  row: number;
  width: number;
  height: number;
}

export interface GridSettings {
  gutterSize: number;
  rowHeight: number;
  columnCount: number;
}
