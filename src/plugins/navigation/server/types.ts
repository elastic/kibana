/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { CloudExperimentsPluginStart } from '@kbn/cloud-experiments-plugin/common';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/server';
import type { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface NavigationServerSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface NavigationServerStart {}

export interface NavigationServerSetupDependencies {
  cloud?: CloudSetup;
  spaces?: SpacesPluginSetup;
}

export interface NavigationServerStartDependencies {
  cloudExperiments?: CloudExperimentsPluginStart;
  cloud?: CloudStart;
  spaces?: SpacesPluginStart;
}
