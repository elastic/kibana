/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionFunction } from '@kbn/expressions-plugin/common';
import { PresentationUtilPlugin } from './plugin';
import { pluginServices } from './services';

export type {
  PresentationCapabilitiesService,
  PresentationDashboardsService,
  PresentationLabsService,
} from './services';

export type {
  KibanaPluginServiceFactory,
  PluginServiceFactory,
  PluginServiceProviders,
  KibanaPluginServiceParams,
} from './services/create';
export { PluginServices, PluginServiceProvider, PluginServiceRegistry } from './services/create';

export type { PresentationUtilPluginSetup, PresentationUtilPluginStart } from './types';
export type { SaveModalDashboardProps } from './components/types';

export {
  LazyExpressionInput,
  LazyLabsBeakerButton,
  LazyLabsFlyout,
  LazyDashboardPicker,
  LazySavedObjectSaveModalDashboard,
  withSuspense,
  LazyDataViewPicker,
  LazyFieldPicker,
} from './components';

export {
  lazyLoadReduxEmbeddablePackage,
  cleanFiltersForSerialize,
  type ReduxEmbeddableState,
  type ReduxEmbeddableTools,
  type ReduxEmbeddablePackage,
} from './redux_embeddables';

export type {
  ExpressionInputEditorRef,
  ExpressionInputProps,
  OnExpressionInputEditorDidMount,
} from './components/types';

/** @deprecated QuickButtonProps - use `IconButtonGroupProps` from `@kbn/shared-ux-button-toolbar` */
export type { QuickButtonProps } from './components/solution_toolbar';

export {
  /** @deprecated AddFromLibraryButton  - use `AddFromLibraryButton` from `@kbn/shared-ux-button-toolbar` */
  AddFromLibraryButton,
  /** @deprecated PrimaryActionButton  - use `PrimaryButton` from `@kbn/shared-ux-button-toolbar` */
  PrimaryActionButton,
  /** @deprecated SolutionToolbarPopover  - use `ToolbarPopover` from `@kbn/shared-ux-button-toolbar` */
  PrimaryActionPopover,
  /** @deprecated QuickButtonGroup  - use `IconButtonGroup` from `@kbn/shared-ux-button-toolbar` */
  QuickButtonGroup,
  SolutionToolbar,
  /** @deprecated SolutionToolbarButton  - use `PrimaryButton` from `@kbn/shared-ux-button-toolbar` */
  SolutionToolbarButton,
  /** @deprecated SolutionToolbarPopover  - use `ToolbarPopover` from `@kbn/shared-ux-button-toolbar` */
  SolutionToolbarPopover,
} from './components/solution_toolbar';

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

export const getContextProvider = () => pluginServices.getContextProvider();
