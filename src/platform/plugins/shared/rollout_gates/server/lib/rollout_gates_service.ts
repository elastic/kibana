/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { BuildIdentity } from './build_comparator';
import type { RolloutPhase } from './resolve_phase';
import { resolvePhase } from './resolve_phase';
import type { GateLedger } from './gate_ledger';
import { retryUntilAvailable } from './retry_until_available';

/** Everything the debug route needs to explain why a gate is in the phase it is in. */
export interface GateDebugInfo {
  gateId: string;
  phase: RolloutPhase;
  currentBuild: BuildIdentity;
  /** Absent when the service never touched the ledger — see `noOpReason`. */
  introducingBuild?: BuildIdentity;
  /** Absent when the service never touched the ledger — see `noOpReason`. */
  genesisBuild?: BuildIdentity;
  /** Set when the gate was resolved to `finalized` without ever consulting Elasticsearch. */
  noOpReason?: 'not-serverless' | 'not-real-build';
}

export interface RolloutGatesServiceDeps {
  logger: Logger;
  isServerless: boolean;
  isRealBuild: boolean;
  currentBuild: BuildIdentity;
  declaredGateIds: ReadonlySet<string>;
  ledger: GateLedger;
  /** Overridable for tests; defaults to the real exponential-backoff retry. */
  retry?: typeof retryUntilAvailable;
}

/**
 * Resolves and caches the rollout phase of every gate declared during setup.
 *
 * Outside Serverless, or when not running a real build, this is a pure no-op: every declared
 * gate resolves to `finalized` immediately, and the ledger (Elasticsearch) is never read from
 * or written to. On Serverless with a real build, `start()` kicks off one retrying write of
 * the genesis record and one retrying write per declared gate; `getPhase` awaits those.
 */
export class RolloutGatesService {
  private readonly infoByGateId = new Map<string, Promise<GateDebugInfo>>();
  private readonly retry: typeof retryUntilAvailable;
  private stopped = false;

  constructor(private readonly deps: RolloutGatesServiceDeps) {
    this.retry = deps.retry ?? retryUntilAvailable;
  }

  public start(): void {
    const { isServerless, isRealBuild, declaredGateIds, currentBuild, logger } = this.deps;

    if (!isServerless || !isRealBuild) {
      const noOpReason = !isServerless ? 'not-serverless' : 'not-real-build';
      for (const gateId of declaredGateIds) {
        this.infoByGateId.set(
          gateId,
          Promise.resolve({ gateId, phase: 'finalized', currentBuild, noOpReason })
        );
      }
      return;
    }

    const genesisReady = this.retry(() => this.deps.ledger.recordGenesis(currentBuild), {
      logger,
      label: 'rollout-gates: recording the genesis build',
      isStopped: () => this.stopped,
    });
    // Surface failures (including shutdown) in the log even if no gate is ever asked about.
    genesisReady.catch((error) => logger.error(error));

    for (const gateId of declaredGateIds) {
      this.infoByGateId.set(
        gateId,
        genesisReady.then(async (genesisBuild) => {
          const introducingBuild = await this.retry(
            () => this.deps.ledger.recordGate(gateId, currentBuild),
            {
              logger,
              label: `rollout-gates: recording the introducing build for "${gateId}"`,
              isStopped: () => this.stopped,
            }
          );
          const phase = resolvePhase({
            isServerless,
            isRealBuild,
            currentBuild,
            introducingBuild,
            genesisBuild,
          });
          return { gateId, phase, currentBuild, introducingBuild, genesisBuild };
        })
      );
    }
  }

  /** Stops any in-flight retry loops; does not reject already-resolved gate phases. */
  public stop(): void {
    this.stopped = true;
  }

  public getPhase(gateId: string): Promise<RolloutPhase> {
    return this.getDebugInfo(gateId).then((info) => info.phase);
  }

  /** Throws synchronously if `gateId` was never declared during setup. */
  public getDebugInfo(gateId: string): Promise<GateDebugInfo> {
    const info = this.infoByGateId.get(gateId);
    if (!info) {
      throw new Error(
        `Rollout gate "${gateId}" was never declared. Call rolloutGates.declare("${gateId}") ` +
          'during setup before asking about its phase.'
      );
    }
    return info;
  }
}
