/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ReadonlyContainer } from '@kbn/core-di-common';

/**
 * Core's `injection` request handler context.
 * @public
 */
export interface InjectionRequestHandlerContext {
  /**
   * The injection container scoped to the current request
   * and to the plugin that registered the handler.
   */
  container: ReadonlyContainer;
}
