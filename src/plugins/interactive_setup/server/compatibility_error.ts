/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { NodesVersionCompatibility } from 'src/core/server';

export class CompatibilityError extends Error {
  constructor(private meta: NodesVersionCompatibility) {
    super('Compatibility Error');
    Error.captureStackTrace(this, CompatibilityError);
    this.name = 'CompatibilityError';
    this.message = meta.message!;
  }

  public get elasticsearchVersion() {
    return this.meta.incompatibleNodes[0].version;
  }

  public get kibanaVersion() {
    return this.meta.kibanaVersion;
  }
}
