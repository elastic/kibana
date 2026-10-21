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

export class DataViewNotFoundError extends LensError {
  public readonly code = LENS_ERROR_CODES.DATA_VIEW_NOT_FOUND;

  constructor(public readonly layerId: string) {
    super(`Cannot resolve the data view for layer "${layerId}".`);
  }
}
