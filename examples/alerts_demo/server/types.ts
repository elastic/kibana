/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginSetupContract as AlertingSetup } from '../../../x-pack/plugins/alerting/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../../x-pack/plugins/features/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AlertsDemoPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AlertsDemoPluginStart {}

export interface AlertsDemoServerSetupDeps {
  alerting: AlertingSetup;
  features: FeaturesPluginSetup;
}
