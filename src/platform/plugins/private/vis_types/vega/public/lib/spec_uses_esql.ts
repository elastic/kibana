/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CONSTANTS } from '../data_model/types';
import type { Data, VegaSpec } from '../data_model/types';

/**
 * Whether a Vega specification contains at least one ES|QL data source.
 */
export function specUsesEsql(spec: VegaSpec): boolean {
  const isEsqlDataObject = (dataObj: Data) =>
    Boolean(dataObj.url && dataObj.url[CONSTANTS.TYPE] === 'esql');

  if (!spec.data) return false;

  return Array.isArray(spec.data) ? spec.data.some(isEsqlDataObject) : isEsqlDataObject(spec.data);
}
