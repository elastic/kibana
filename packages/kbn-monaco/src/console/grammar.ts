/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createParser } from './parser';
export { createParser } from './parser';

export enum AnnoTypes {
  error = 'error',
  warning = 'warning',
}

export type Parser = ReturnType<typeof createParser>;

export interface Annotation {
  name?: string;
  type: AnnoTypes;
  text: string;
  at: number;
}

export interface ParseResult {
  annotations: Annotation[];
}
