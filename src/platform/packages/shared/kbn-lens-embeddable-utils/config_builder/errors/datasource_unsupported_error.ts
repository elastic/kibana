/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LENS_ERROR_CODES } from './constants';
import { LensError } from './lens_error';

export class DatasourceUnsupportedError extends LensError {
  public readonly code = LENS_ERROR_CODES.DATASOURCE_UNSUPPORTED;

  constructor() {
    super('Unsupported DataSource type');
  }
}
