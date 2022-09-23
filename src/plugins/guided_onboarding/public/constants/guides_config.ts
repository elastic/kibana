/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { GuidesConfig } from '../types';
import { securityConfig } from './security';
import { observabilityConfig } from './observability';
import { searchConfig } from './search';

export const guidesConfig: GuidesConfig = {
  security: securityConfig,
  observability: observabilityConfig,
  search: searchConfig,
};
