/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CategoryCount } from './custom_integration_registry';

export interface CustomIntegrationsPluginSetup {
  registerCustomIntegration(customIntegration: CustomIntegration): void;
  getNonBeatsCustomIntegrations(): CustomIntegration[];
  getNonBeatsCategories(): CategoryCount[];
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CustomIntegrationsPluginStart {}

export interface CustomIntegration {
  title: string;
  name: string;
  description: string;
  type: 'ui_link';
  uiInternalPath: string;
  euiIconType: string;
  categories: string[];
  isBeats: boolean;
}
