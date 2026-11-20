/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { BuildIdentity } from './lib/build_comparator';
import { ROLLOUT_GATE_SO_TYPE } from './lib/constants';
import { assertValidGateId } from './lib/gate_id';
import { GateLedger } from './lib/gate_ledger';
import { RolloutGatesService } from './lib/rollout_gates_service';
import { rolloutGateType } from './saved_objects';
import { registerGetPhaseRoute } from './routes';
import type { RolloutGatesConfig } from './config';
import type { RolloutGatesSetup, RolloutGatesStart } from './types';

export class RolloutGatesPlugin implements Plugin<RolloutGatesSetup, RolloutGatesStart> {
  private readonly logger: Logger;
  private readonly config: RolloutGatesConfig;
  private readonly isServerless: boolean;
  private readonly isRealBuild: boolean;
  private readonly currentBuild: BuildIdentity;
  private readonly declaredGateIds = new Set<string>();
  private service?: RolloutGatesService;

  constructor(initContext: PluginInitializerContext) {
    this.logger = initContext.logger.get();
    this.config = initContext.config.get<RolloutGatesConfig>();

    const { packageInfo } = initContext.env;
    this.isServerless = packageInfo.buildFlavor === 'serverless';
    this.isRealBuild = packageInfo.dist || this.config.dev.buildNum !== undefined;
    this.currentBuild = {
      sha: packageInfo.buildSha,
      num: this.config.dev.buildNum ?? packageInfo.buildNum,
      date: packageInfo.buildDate.toISOString(),
    };

    // Auto-declare dev-only gates so the debug route is useful without a real consumer plugin.
    // `assertValidGateId` also catches a misconfigured non-dist buildNum override combined
    // with a config-schema default that would otherwise slip through silently.
    for (const gateId of this.config.dev.gates) {
      assertValidGateId(gateId);
      this.declaredGateIds.add(gateId);
    }
  }

  public setup(core: CoreSetup): RolloutGatesSetup {
    core.savedObjects.registerType(rolloutGateType);

    registerGetPhaseRoute(core.http.createRouter(), () => this.service);

    return {
      declare: (gateId: string) => {
        assertValidGateId(gateId);
        this.declaredGateIds.add(gateId);
      },
    };
  }

  public start(core: CoreStart): RolloutGatesStart {
    const repository = core.savedObjects.createInternalRepository([ROLLOUT_GATE_SO_TYPE]);
    const ledger = new GateLedger({ repository, logger: this.logger });

    this.service = new RolloutGatesService({
      logger: this.logger,
      isServerless: this.isServerless,
      isRealBuild: this.isRealBuild,
      currentBuild: this.currentBuild,
      declaredGateIds: this.declaredGateIds,
      ledger,
    });
    this.service.start();

    const service = this.service;
    return {
      getPhase: (gateId: string) => service.getPhase(gateId),
      isFinalized: async (gateId: string) => (await service.getPhase(gateId)) === 'finalized',
    };
  }

  public stop() {
    this.service?.stop();
  }
}
