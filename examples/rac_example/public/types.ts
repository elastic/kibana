/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '../../../x-pack/plugins/triggers_actions_ui/public';
import type { CoreSetup, CoreStart, Plugin as PluginClass } from '../../../src/core/public';

import { NavigationPublicPluginStart } from '../../../src/plugins/navigation/public';
import {
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
} from '../../../x-pack/plugins/observability/public';
import { DeveloperExamplesSetup } from '../../developer_examples/public';

export interface RacExamplePluginSetup {
  getGreeting: () => string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RacExamplePluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export interface RacExampleClientSetupDeps {
  observability: ObservabilityPublicSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  developerExamples: DeveloperExamplesSetup;
}

export interface RacExampleClientStartDeps {
  observability: ObservabilityPublicStart;
  navigation: NavigationPublicPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  developerExamples: DeveloperExamplesSetup;
}

export type RacExampleSetupExports = void;
export type RacExampleStartExports = void;

export type RacExampleClientCoreSetup = CoreSetup<
  RacExampleClientStartDeps,
  RacExampleStartExports
>;
export type RacExampleClientCoreStart = CoreStart;

export type RacExamplePluginClass = PluginClass<
  RacExampleSetupExports,
  RacExampleStartExports,
  RacExampleClientSetupDeps,
  RacExampleClientStartDeps
>;
