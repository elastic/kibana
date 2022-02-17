/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CustomIntegrationsPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new CustomIntegrationsPlugin();
}

export type { CustomIntegrationsSetup, CustomIntegrationsStart } from './types';

export { withSuspense, LazyReplacementCard } from './components';
export { filterCustomIntegrations } from './services/find';
