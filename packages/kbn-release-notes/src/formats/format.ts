/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ToolingLog } from '@kbn/dev-utils';

import { Version, ClassifiedPr } from '../lib';

export abstract class Format {
  static extension: string;

  constructor(
    protected readonly version: Version,
    protected readonly prs: ClassifiedPr[],
    protected readonly log: ToolingLog
  ) {}

  abstract print(): Iterator<string>;
}
