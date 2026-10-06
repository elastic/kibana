/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { IEsError } from './types';
/**
 * Checks if a given errors originated from Elasticsearch.
 * Those params are assigned to the attributes property of an error.
 *
 * @param e
 */
export declare function isEsError(e: any): e is IEsError;
export declare class EsError extends Error {
  readonly attributes: IEsError['attributes'];
  private readonly openInInspector;
  constructor(err: IEsError, message: string, openInInspector: () => void);
  getErrorMessage(): React.JSX.Element;
  getActions(): React.JSX.Element[];
}
