/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SharedUxPlatformService } from '@kbn/shared-ux-services';
import { SharedUXPluginStartDeps } from '../types';
import { KibanaPluginServiceFactory } from './types';

/**
 * A factory function for creating a Kibana-based implementation of `SharedUXPlatformService`.
 */
export type PlatformServiceFactory = KibanaPluginServiceFactory<
  SharedUxPlatformService,
  SharedUXPluginStartDeps
>;

/**
 * A factory function for creating a Kibana-based implementation of `SharedUXPlatformService`.
 */
export const platformServiceFactory: PlatformServiceFactory = ({ coreStart }) => ({
  setIsFullscreen: (isVisible: boolean) => coreStart.chrome.setIsVisible(isVisible),
});
