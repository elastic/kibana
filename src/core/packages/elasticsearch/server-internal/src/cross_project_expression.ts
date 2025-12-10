/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';

const DEFAULT_EXPRESSION = 'local';

/** @internal */
export type CrossProjectExpressionGetter = (request: KibanaRequest) => Promise<string>;

export interface UiSettingsReader {
  read: (request: KibanaRequest) => Promise<string>;
}

export class CrossProjectExpression {
  constructor(private readonly getCrossProjectExpression: CrossProjectExpressionGetter) {}

  asInternal() {
    return DEFAULT_EXPRESSION;
  }

  asScoped(request: KibanaRequest) {
    return this.getCrossProjectExpression(request);
  }
}
