/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OVERWRITE_REJECTED, SAVE_DUPLICATE_REJECTED } from '../../constants';

/**
 * @param error {Error} the error
 * @return {boolean}
 */
export function isErrorNonFatal(error: { message: string }): boolean {
  if (!error) return false;
  return error.message === OVERWRITE_REJECTED || error.message === SAVE_DUPLICATE_REJECTED;
}
