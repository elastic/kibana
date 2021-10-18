/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const VIS_TYPE_TABLE = 'table';

export enum AggTypes {
  SUM = 'sum',
  AVG = 'avg',
  MIN = 'min',
  MAX = 'max',
  COUNT = 'count',
}

export interface TableVisParams {
  perPage: number | '';
  showPartialRows: boolean;
  showMetricsAtAllLevels: boolean;
  showToolbar: boolean;
  showTotal: boolean;
  totalFunc: AggTypes;
  percentageCol: string;
  autoFitRowToContent?: boolean;
  row?: boolean;
}
