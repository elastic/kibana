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

export interface AlertsDemoPluginSetup {
  getGreeting: () => string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AlertsDemoPluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export interface AlertsDemoClientSetupDeps {
  observability: ObservabilityPublicSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  developerExamples: DeveloperExamplesSetup;
  // navigation: NavigationPublicPluginStart;
}

export interface AlertsDemoClientStartDeps {
  observability: ObservabilityPublicStart;
  navigation: NavigationPublicPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  developerExamples: DeveloperExamplesSetup;
}

export type AlertsDemoSetupExports = void;
export type AlertsDemoStartExports = void;

export type AlertsDemoClientCoreSetup = CoreSetup<
  AlertsDemoClientStartDeps,
  AlertsDemoStartExports
>;
export type AlertsDemoClientCoreStart = CoreStart;

export type AlertsDemoPluginClass = PluginClass<
  AlertsDemoSetupExports,
  AlertsDemoStartExports,
  AlertsDemoClientSetupDeps,
  AlertsDemoClientStartDeps
>;
