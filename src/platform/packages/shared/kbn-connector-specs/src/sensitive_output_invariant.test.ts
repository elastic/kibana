/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as connectorsSpecs from './all_specs';
import type { ConnectorSpec } from './connector_spec';

/**
 * Repository invariants backing the `sensitiveOutput` redaction mechanism (see the
 * actions plugin's `sensitive_output_access_token.ts` and `ActionExecutor`).
 *
 * The redaction that keeps credential material out of the HTTP `_execute` response,
 * Workflow execution history, and Agent Builder/LLM context is driven entirely by each
 * action's `sensitiveOutput: true` flag. These tests are the CI backstop for the two
 * ways that flag can silently stop protecting a connector:
 *
 *  1. A connector whose whole purpose is resolving secrets ships (now or later) an
 *     action that forgets the flag -- that action's raw output would then flow to every
 *     generic execution surface unredacted. `SECRET_RESOLVING_CONNECTOR_IDS` pins the
 *     set of such connectors; every action they declare must be `sensitiveOutput`.
 *  2. A `sensitiveOutput` action also streams. Redaction replaces the finalized
 *     `result.data`; it cannot claw back bytes already streamed to the caller, so a
 *     streaming sensitive action would leak despite the flag. Disallow the combination.
 *
 * When you add a new secret-resolving connector type, add its `metadata.id` to
 * `SECRET_RESOLVING_CONNECTOR_IDS` below.
 */

// Connector types whose actions return credential material and therefore must have
// every action marked `sensitiveOutput: true`.
const SECRET_RESOLVING_CONNECTOR_IDS: readonly string[] = ['.hashicorp_vault'];

const allSpecs = (Object.values(connectorsSpecs) as unknown[]).filter(
  (value): value is ConnectorSpec =>
    typeof value === 'object' &&
    value !== null &&
    'metadata' in value &&
    'actions' in value &&
    typeof (value as ConnectorSpec).metadata?.id === 'string'
);

const specsById = new Map(allSpecs.map((spec) => [spec.metadata.id, spec]));

describe('sensitiveOutput invariants', () => {
  it('finds every secret-resolving connector id it is meant to guard', () => {
    const missing = SECRET_RESOLVING_CONNECTOR_IDS.filter((id) => !specsById.has(id));
    expect(missing).toEqual([]);
  });

  it.each(SECRET_RESOLVING_CONNECTOR_IDS)(
    'secret-resolving connector %s marks every action as sensitiveOutput',
    (id) => {
      const spec = specsById.get(id);
      if (!spec) {
        throw new Error(`Secret-resolving connector '${id}' is not registered.`);
      }

      const unmarkedActions = Object.entries(spec.actions)
        .filter(([, action]) => action.sensitiveOutput !== true)
        .map(([actionName]) => actionName);

      // Every action of a secret-resolving connector must have sensitiveOutput: true, so
      // its result is redacted on every generic execution surface unless the caller holds
      // the actions plugin's capability token.
      expect(unmarkedActions).toEqual([]);
    }
  );

  it('no connector declares a sensitiveOutput action that also streams', () => {
    const streamingSensitiveActions: string[] = [];

    for (const spec of allSpecs) {
      for (const [actionName, action] of Object.entries(spec.actions)) {
        if (action.sensitiveOutput === true && action.supportsStreaming === true) {
          streamingSensitiveActions.push(`${spec.metadata.id}.${actionName}`);
        }
      }
    }

    // Redaction swaps the finalized result.data; it cannot redact a response that has
    // already been streamed. A sensitiveOutput action must therefore be non-streaming.
    expect(streamingSensitiveActions).toEqual([]);
  });
});
