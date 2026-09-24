/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID = 'alertzero';

/**
 * The `origin` every AlertZero proposal is stamped with, and the value its
 * queue filters on.
 *
 * The proposals plugin owns no origin vocabulary — it serves callers beyond
 * AlertZero and cannot learn their names — so the value belongs here. A typo
 * would drop a proposal out of the queue's filter with no error anywhere, which
 * is why the workflow shape tests pin the YAML literal to this constant and the
 * queue reads the same one.
 */
export const ALERTZERO_PROPOSAL_ORIGIN = 'alertzero';

export const ALERTZERO_WORKER_MANAGEMENT = {
  enablement: 'restorable',
  lifecycle: 'dynamic',
  versionStrategy: 'auto',
} as const;

export const ALERTZERO_RULE_WORKFLOW_MANAGEMENT = {
  enablement: 'restorable',
  lifecycle: 'static',
  versionStrategy: 'auto',
} as const;

/**
 * Sub-workflows a Worker invokes via `workflow.execute`.
 *
 * Enablement is enforced rather than restorable: they own no trigger, so a
 * disabled one cannot be invoked at all and would silently break its parent.
 * `restorable` would also pin the installed value across upgrades, so a
 * workflow installed while disabled could never be re-enabled by a new version.
 */
export const ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT = {
  enablement: 'enforced',
  lifecycle: 'static',
  versionStrategy: 'auto',
} as const;
