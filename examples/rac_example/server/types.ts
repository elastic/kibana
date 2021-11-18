/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginSetupContract as AlertingSetup } from '../../../x-pack/plugins/alerting/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../../x-pack/plugins/features/server';
import {
  createLifecycleExecutor,
  RuleRegistryPluginSetupContract,
} from '../../../x-pack/plugins/rule_registry/server';

type LifecycleRuleExecutorCreator = ReturnType<typeof createLifecycleExecutor>;
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AlertsDemoPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AlertsDemoPluginStart {}

export interface AlertsDemoServerSetupDeps {
  alerting: AlertingSetup;
  features: FeaturesPluginSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;
}

export interface RulesServiceSetupDeps {
  alerting: AlertingSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;
}

export interface RulesServiceSetup {
  createLifecycleRuleExecutor: LifecycleRuleExecutorCreator;
}

export type RuleRegistrationContext = 'observability.rac_example';

export interface BackendLibs {
  rules: RulesServiceSetup;
}

export type DemoFeatureId = 'rac_example'; // TODO must be one of the allowed consumers
