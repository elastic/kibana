/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginInitializerContext } from 'kibana/public';

export {
  FeatureCatalogueSetup,
  EnvironmentSetup,
  TutorialSetup,
  HomePublicPluginSetup,
  HomePublicPluginStart,
} from './plugin';
export {
  FeatureCatalogueEntry,
  FeatureCatalogueSolution,
  FeatureCatalogueCategory,
  Environment,
  TutorialVariables,
  TutorialDirectoryNoticeComponent,
  TutorialDirectoryHeaderLinkComponent,
  TutorialModuleNoticeComponent,
} from './services';
export * from '../common/instruction_variant';
import { HomePublicPlugin } from './plugin';

export const plugin = (initializerContext: PluginInitializerContext) =>
  new HomePublicPlugin(initializerContext);
