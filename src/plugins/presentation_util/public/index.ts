/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// TODO: https://github.com/elastic/kibana/issues/110893
/* eslint-disable @kbn/eslint/no_export_all */

import { ExpressionFunction } from 'src/plugins/expressions';
import { PresentationUtilPlugin } from './plugin';
import { pluginServices } from './services';

export type {
  PresentationCapabilitiesService,
  PresentationDashboardsService,
  PresentationLabsService,
} from './services';
export { getStubPluginServices } from './services';

export type {
  KibanaPluginServiceFactory,
  PluginServiceFactory,
  PluginServiceProviders,
  KibanaPluginServiceParams,
} from './services/create';
export { PluginServices, PluginServiceProvider, PluginServiceRegistry } from './services/create';

export type { PresentationUtilPluginSetup, PresentationUtilPluginStart } from './types';
export type { SaveModalDashboardProps } from './components/types';
export type { ProjectID, Project } from '../common/labs';
export { projectIDs } from '../common/labs';
export * from '../common/lib';

export {
  LazyExpressionInput,
  LazyLabsBeakerButton,
  LazyLabsFlyout,
  LazyDashboardPicker,
  LazySavedObjectSaveModalDashboard,
  withSuspense,
  LazyDataViewPicker,
  LazyFieldPicker,
  LazyReduxEmbeddableWrapper,
} from './components';

export * from './components/types';

export type { QuickButtonProps } from './components/solution_toolbar';

/** @deprecated QuickButtonGroup  - use `IconButtonGroup` from `@kbn/shared-ux-components */
export {
  AddFromLibraryButton,
  PrimaryActionButton,
  PrimaryActionPopover,
  QuickButtonGroup,
  SolutionToolbar,
  SolutionToolbarButton,
  SolutionToolbarPopover,
} from './components/solution_toolbar';

export {
  ReduxEmbeddableContext,
  useReduxContainerContext,
  useReduxEmbeddableContext,
  type ReduxContainerContextServices,
  type ReduxEmbeddableWrapperPropsWithChildren,
} from './components/redux_embeddables';

/**
 * Register a set of Expression Functions with the Presentation Utility ExpressionInput.  This allows
 * the Monaco Editor to understand the functions and their arguments.
 *
 * This function is async in order to move the logic to an async chunk.
 *
 * @param expressionFunctions A set of Expression Functions to use in the ExpressionInput.
 */
export const registerExpressionsLanguage = async (expressionFunctions: ExpressionFunction[]) => {
  const languages = await import('./components/expression_input/language');
  return languages.registerExpressionsLanguage(expressionFunctions);
};

export function plugin() {
  return new PresentationUtilPlugin();
}

export const useLabs = () => (() => pluginServices.getHooks().labs.useService())();
