/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, Plugin, CoreSetup, AppMountParameters } from '@kbn/core/public';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import { getServices } from './services';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
}

export class OtelWorkshopPlugin implements Plugin<{}, {}, SetupDeps, {}> {
  public setup(core: CoreSetup, { developerExamples }: SetupDeps) {
    core.application.register({
      id: 'otelWorkshop',
      title: 'Coffee Shop (OTel Workshop)',
      visibleIn: [],
      async mount(params: AppMountParameters) {
        const [coreStart] = await core.getStartServices();
        const services = getServices(coreStart);
        const { renderApp } = await import('./app');
        return renderApp(services, params.element);
      },
    });

    developerExamples.register({
      appId: 'otelWorkshop',
      title: 'Coffee Shop (OTel Workshop)',
      description:
        'Hands-on exercise: instrument a fake coffee-shop order pipeline with OpenTelemetry metrics and traces the Kibana way.',
    });

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
