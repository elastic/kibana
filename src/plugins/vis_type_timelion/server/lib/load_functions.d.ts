/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { TimelionFunctionInterface } from '../types';

declare function loadFunctions(directory: string): LoadFunctions;

export interface LoadFunctions {
  [key: string]: TimelionFunctionInterface;
}

// eslint-disable-next-line import/no-default-export
export default loadFunctions;
