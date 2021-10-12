/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// TODO: https://github.com/elastic/kibana/issues/110893
/* eslint-disable @kbn/eslint/no_export_all */

import { PresentationUtilPlugin } from './plugin';

export {
  PresentationCapabilitiesService,
  PresentationDashboardsService,
  PresentationLabsService,
  getStubPluginServices,
} from './services';

export {
  KibanaPluginServiceFactory,
  PluginServiceFactory,
  PluginServices,
  PluginServiceProviders,
  PluginServiceProvider,
  PluginServiceRegistry,
  KibanaPluginServiceParams,
} from './services/create';

export { PresentationUtilPluginSetup, PresentationUtilPluginStart } from './types';
export { SaveModalDashboardProps } from './components/types';
export { projectIDs, ProjectID, Project } from '../common/labs';
export * from '../common/lib';

export {
  LazyLabsBeakerButton,
  LazyLabsFlyout,
  LazyDashboardPicker,
  LazySavedObjectSaveModalDashboard,
  withSuspense,
} from './components';

export * from './components/types';

export {
  AddFromLibraryButton,
  PrimaryActionButton,
  PrimaryActionPopover,
  QuickButtonGroup,
  QuickButtonProps,
  SolutionToolbar,
  SolutionToolbarButton,
  SolutionToolbarPopover,
} from './components/solution_toolbar';

export function plugin() {
  return new PresentationUtilPlugin();
}

import { pluginServices } from './services';

export const useLabs = () => (() => pluginServices.getHooks().labs.useService())();
