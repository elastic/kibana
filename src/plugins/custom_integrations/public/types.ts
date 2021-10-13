/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PresentationUtilPluginStart } from '../../presentation_util/public';

import { CustomIntegration } from '../common';

export interface CustomIntegrationsSetup {
  getAppendCustomIntegrations: () => Promise<CustomIntegration[]>;
  getReplacementCustomIntegrations: () => Promise<CustomIntegration[]>;
}

export interface CustomIntegrationsStart {
  ContextProvider: React.FC;
}

export interface CustomIntegrationsStartDependencies {
  presentationUtil: PresentationUtilPluginStart;
}
