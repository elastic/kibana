/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { PresentationUtilPlugin } from './plugin';
import { pluginServices } from './services';

export { Project, ProjectID, projectIDs } from '../common/labs';
export * from '../common/lib';
export {
  LazyDashboardPicker,
  LazyLabsBeakerButton,
  LazyLabsFlyout,
  LazySavedObjectSaveModalDashboard,
  withSuspense,
} from './components';
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
export * from './components/types';
export { SaveModalDashboardProps } from './components/types';
export {
  getStubPluginServices,
  PresentationCapabilitiesService,
  PresentationDashboardsService,
  PresentationLabsService,
} from './services';
export {
  KibanaPluginServiceFactory,
  KibanaPluginServiceParams,
  PluginServiceFactory,
  PluginServiceProvider,
  PluginServiceProviders,
  PluginServiceRegistry,
  PluginServices,
} from './services/create';
export { PresentationUtilPluginSetup, PresentationUtilPluginStart } from './types';

export function plugin() {
  return new PresentationUtilPlugin();
}

export const useLabs = () => (() => pluginServices.getHooks().labs.useService())();
