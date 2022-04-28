/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { action } from '@storybook/addon-actions';
import { ServiceFactory, SharedUxPlatformService } from '@kbn/shared-ux-services';

/**
 * A factory function for creating a Storybook implementation of `SharedUxPlatformService`.
 */
export type PlatformServiceFactory = ServiceFactory<SharedUxPlatformService, {}>;

/**
 * A factory function for creating a Storybook implementation of `SharedUxPlatformService`.
 */
export const platformServiceFactory: PlatformServiceFactory = () => ({
  setIsFullscreen: action('setIsChromeVisible'),
});
