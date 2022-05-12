/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { action } from '@storybook/addon-actions';

import { ServiceFactory, SharedUxHttpService } from '@kbn/shared-ux-services';

/**
 * A factory function for creating a Storybook-based implementation of `SharedUXHttpService`.
 */
export type HttpServiceFactory = ServiceFactory<SharedUxHttpService, {}>;

/**
 * A factory function for creating a Storybook-based implementation of `SharedUXHttpService`.
 */
export const httpServiceFactory: HttpServiceFactory = () => ({
  addBasePath: action('addBasePath') as SharedUxHttpService['addBasePath'],
});
