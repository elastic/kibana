/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Logger } from 'src/core/server';
import { RulesServiceSetupDeps, RuleRegistrationContext, DemoFeatureId } from '../types';

export enum Dataset {
  alerts = 'alerts',
  events = 'events',
}

export class RulesService {
  constructor(
    public readonly ownerFeatureId: DemoFeatureId,
    public readonly registrationContext: RuleRegistrationContext,
    public readonly logger: Logger
  ) {}

  public setup(core: CoreSetup, setupDeps: RulesServiceSetupDeps) {
    const ruleDataClient = setupDeps.ruleRegistry.ruleDataService.initializeIndex({
      feature: this.ownerFeatureId,
      registrationContext: this.registrationContext,
      dataset: Dataset.alerts,
      componentTemplateRefs: [],
      componentTemplates: [
        {
          name: 'mappings',
          mappings: {},
        },
      ],
    });

    const createLifecycleRuleExecutor = setupDeps.ruleRegistry.createLifecycleExecutor(
      this.logger,
      ruleDataClient
    );

    return {
      createLifecycleRuleExecutor,
      ruleDataClient,
    };
  }

  public start(core: CoreStart) {}
}
