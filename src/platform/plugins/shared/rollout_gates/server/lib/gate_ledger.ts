/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { Logger } from '@kbn/logging';
import { GENESIS_RECORD_LABEL, GENESIS_SO_ID, ROLLOUT_GATE_SO_TYPE } from './constants';
import type { BuildIdentity } from './build_comparator';
import { compareBuilds } from './build_comparator';
import type { RolloutGateAttributes } from '../saved_objects/schemas/rollout_gate';

const MAX_LOWER_ATTEMPTS = 5;

const soIdForGate = (gateId: string): string => `gate:${gateId}`;

const toAttributes = (gateId: string, build: BuildIdentity): RolloutGateAttributes => ({
  gateId,
  buildSha: build.sha,
  buildNum: build.num,
  buildDate: build.date,
  recordedAt: new Date().toISOString(),
});

const toBuildIdentity = (attributes: RolloutGateAttributes): BuildIdentity => ({
  sha: attributes.buildSha,
  num: attributes.buildNum,
  date: attributes.buildDate,
});

export interface GateLedgerDeps {
  repository: ISavedObjectsRepository;
  logger: Logger;
}

/**
 * Elasticsearch-backed ledger of the oldest build that has observed each rollout gate, plus a
 * `genesis` record for the oldest build this project's ledger has ever seen for any gate.
 *
 * "Oldest" is enforced with create-if-absent (the Saved Objects `create` API, which conflicts
 * on an existing id) followed by a compare-and-swap lower-if-older update. That makes
 * `recordGate`/`recordGenesis` safe to call from every Kibana node on every boot, in any
 * order: concurrent nodes racing to record the same gate converge on the true minimum build
 * regardless of which one wins the initial create.
 */
export class GateLedger {
  constructor(private readonly deps: GateLedgerDeps) {}

  /** Records `build` as the genesis build if the ledger has never recorded one. */
  recordGenesis(build: BuildIdentity): Promise<BuildIdentity> {
    return this.recordIntroduction(GENESIS_SO_ID, GENESIS_RECORD_LABEL, build);
  }

  /** Records `build` as the introducing build for `gateId` if one is not already known. */
  recordGate(gateId: string, build: BuildIdentity): Promise<BuildIdentity> {
    return this.recordIntroduction(soIdForGate(gateId), gateId, build);
  }

  private async recordIntroduction(
    id: string,
    label: string,
    build: BuildIdentity
  ): Promise<BuildIdentity> {
    try {
      await this.deps.repository.create(ROLLOUT_GATE_SO_TYPE, toAttributes(label, build), {
        id,
        refresh: false,
      });
      return build;
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isConflictError(error)) {
        throw error;
      }
    }
    return this.lowerIfOlder(id, label, build);
  }

  private async lowerIfOlder(
    id: string,
    label: string,
    build: BuildIdentity,
    attempt = 0
  ): Promise<BuildIdentity> {
    const existing = await this.deps.repository.get<RolloutGateAttributes>(
      ROLLOUT_GATE_SO_TYPE,
      id
    );
    const existingBuild = toBuildIdentity(existing.attributes);

    if (compareBuilds(build, existingBuild) >= 0) {
      // The recorded build is already the same age or older: nothing to do.
      return existingBuild;
    }

    try {
      await this.deps.repository.update(ROLLOUT_GATE_SO_TYPE, id, toAttributes(label, build), {
        version: existing.version,
        refresh: false,
      });
      return build;
    } catch (error) {
      if (SavedObjectsErrorHelpers.isConflictError(error) && attempt < MAX_LOWER_ATTEMPTS) {
        this.deps.logger.debug(
          `Retrying the lower-if-older update for rollout gate record "${id}" after a version conflict`
        );
        return this.lowerIfOlder(id, label, build, attempt + 1);
      }
      throw error;
    }
  }
}
