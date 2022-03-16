/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { action } from '@storybook/addon-actions';
import { ServiceFactory, SharedUxApplicationService } from '@kbn/shared-ux-services';

export type ApplicationServiceFactory = ServiceFactory<SharedUxApplicationService>;

/**
 * A factory function for creating for creating a storybook implementation of `SharedUXApplicationService`.
 */
export const applicationServiceFactory: ApplicationServiceFactory = () => ({
  navigateToUrl: () => {
    action('NavigateToUrl');
    return Promise.resolve();
  },
  currentAppId$: new BehaviorSubject('123'),
});
