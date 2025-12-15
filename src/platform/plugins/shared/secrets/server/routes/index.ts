/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter } from '@kbn/core/server';
import { registerGetSearchSecretsRoute } from './get_search_secrets';
import { registerPostCreateSecretRoute } from './post_create_secret';
import { registerGetSecretByIdRoute } from './get_secret_by_id';
import type { SecretsRequestHandlerContext } from '../types';

export function registerRoutes(router: IRouter<SecretsRequestHandlerContext>) {
  registerGetSearchSecretsRoute(router);
  registerPostCreateSecretRoute(router);
  registerGetSecretByIdRoute(router);
}
