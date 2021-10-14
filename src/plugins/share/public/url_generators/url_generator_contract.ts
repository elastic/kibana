/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UrlGeneratorId, UrlGeneratorStateMapping } from './url_generator_definition';

export interface UrlGeneratorContract<Id extends UrlGeneratorId> {
  id: Id;
  createUrl(state: UrlGeneratorStateMapping[Id]['State']): Promise<string>;
  isDeprecated: boolean;
  migrate(state: UrlGeneratorStateMapping[Id]['State']): Promise<{
    state: UrlGeneratorStateMapping[Id]['MigratedState'];
    id: UrlGeneratorStateMapping[Id]['MigratedId'];
  }>;
}
