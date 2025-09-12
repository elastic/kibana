/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters, CoreSetup, CoreStart } from '@kbn/core/public';
import { dynamic } from '@kbn/shared-ux-utility';
import type { MetricsExperienceClient } from './api';
import { createMetricsExperienceClient } from './api';
import type { MetricsExperiencePluginClass, MetricsExperienceService } from './types';
import { METRICS_EXPERIENCE_FEATURE_FLAG_KEY } from '../common/constants';

const MetricsExperienceApplication = dynamic(() =>
  import('./application').then((mod) => ({ default: mod.Application }))
);

export class MetricsExperiencePlugin implements MetricsExperiencePluginClass {
  private repositoryClient!: MetricsExperienceClient;
  public setup(core: CoreSetup) {
    this.repositoryClient = createMetricsExperienceClient(core);

    const repositoryClient = this.repositoryClient;
    // Register app
    core.application.register({
      id: 'metricsExperience',
      title: 'Metrics Experience',
      visibleIn: [],
      async mount(appMountParameters: AppMountParameters) {
        const { element } = appMountParameters;
        const [coreStart] = await core.getStartServices();

        const services: MetricsExperienceService = {
          client: repositoryClient,
        };

        ReactDOM.render(
          coreStart.rendering.addContext(
            <MetricsExperienceApplication
              coreStart={coreStart}
              appMountParameters={appMountParameters}
              service={services}
            />
          ),
          element
        );
        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });

    return {};
  }

  public start(_core: CoreStart) {
    const isEnabled = _core.featureFlags.getBooleanValue(
      METRICS_EXPERIENCE_FEATURE_FLAG_KEY,
      false
    );

    return {
      metricsExperienceClient: isEnabled ? this.repositoryClient : undefined,
    };
  }

  public stop() {}
}
