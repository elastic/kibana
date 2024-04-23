/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AppMountParameters, CoreSetup } from '@kbn/core/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import type { StartDeps } from '../plugin';

const APP_ID = 'embeddablesApp';
const title = 'Embeddables';

export function setupApp(core: CoreSetup<StartDeps>, developerExamples: DeveloperExamplesSetup) {
  core.application.register({
    id: APP_ID,
    title,
    visibleIn: [],
    async mount(params: AppMountParameters) {
      const { renderApp } = await import('./app');
      return renderApp(params.element);
    },
  });
  developerExamples.register({
    appId: APP_ID,
    title,
    description: `Learn how to create new embeddable types and use embeddables in your application.`,
  });
}
