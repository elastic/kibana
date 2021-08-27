/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { PluginInitializerContext } from '../../../core/public/plugins/plugin_context';
import { HomePublicPlugin } from './plugin';

export { getDisplayText, INSTRUCTION_VARIANT } from '../common/instruction_variant';
export type {
  EnvironmentSetup,
  FeatureCatalogueSetup,
  HomePublicPluginSetup,
  HomePublicPluginStart,
  TutorialSetup,
} from './plugin';
export { FeatureCatalogueCategory } from './services';
export type {
  Environment,
  FeatureCatalogueEntry,
  FeatureCatalogueSolution,
  TutorialDirectoryHeaderLinkComponent,
  TutorialDirectoryNoticeComponent,
  TutorialModuleNoticeComponent,
  TutorialVariables,
} from './services';

export const plugin = (initializerContext: PluginInitializerContext) =>
  new HomePublicPlugin(initializerContext);
