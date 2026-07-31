/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Pure classifier for the connector 2-step release check.
 *
 * A connector type must be registered in every Production-NonCanary (PNC) Kibana
 * version before it can declare user-facing features. Serverless rollouts and
 * rollbacks leave nodes on different versions for a while, and an action persisted
 * against a connector type that a node does not have breaks on that node. Once the
 * type is registered in every PNC version, anything else is safe (every node can
 * already handle actions of that type).
 *
 * This module is pure. The runner resolves the PNC versions, decides which connectors
 * this PR makes applicable, and hands plain data here.
 */

// ponytail: allowlist, not a config file — these are the only feature ids safe to ship
// on a connector that is not yet registered in every PNC version, because they persist
// no rollback-fragile user actions.
// NOTE: `agentBuilder` is allowlisted only while the feature is not yet GA. Revisit and
// remove this entry once agentBuilder reaches GA.
const ALLOWED_INITIAL_FEATURE_IDS = ['agentBuilder'];

const shortSha = (sha) => sha.slice(0, 12);

/**
 * @param {Array<{id: string, supportedFeatureIds?: string[], missingFromRefs?: string[]}>} applicableConnectors
 *   Connectors whose exposure this PR changes. `missingFromRefs` lists the PNC refs the
 *   connector is not registered in; empty means it is registered in all of them.
 * @param {{refs?: string[], inconclusiveReason?: string}} release
 *   Resolved PNC refs, or the reason they could not be resolved.
 * @param {{allowedInitialFeatures?: string[]}} [opts]
 * @returns {{status: 'safe'|'unsafe'|'inconclusive', findings: Array<object>, refs: string[], reason?: string}}
 */
function classifyConnectorRelease(applicableConnectors, release = {}, opts = {}) {
  const allowed = new Set(opts.allowedInitialFeatures ?? ALLOWED_INITIAL_FEATURE_IDS);
  const refs = release.refs ?? [];

  // Never report `safe` on missing data: without every PNC version we cannot tell what is
  // registered, so the outcome is explicitly inconclusive.
  const inconclusiveReason =
    release.inconclusiveReason ||
    (refs.length === 0 ? 'No Production-NonCanary versions were resolved.' : undefined);
  if (inconclusiveReason) {
    return { status: 'inconclusive', findings: [], refs, reason: inconclusiveReason };
  }

  const allowedHint = allowed.size ? ` or \`['${[...allowed].join("', '")}']\`` : '';
  const findings = [];

  for (const connector of applicableConnectors) {
    // Registered in every PNC version → every node can handle actions of this type.
    const missingFromRefs = connector.missingFromRefs ?? [];
    if (missingFromRefs.length === 0) continue;

    const supportedFeatureIds = connector.supportedFeatureIds ?? [];
    const disallowedFeatureIds = supportedFeatureIds.filter((f) => !allowed.has(f));
    if (disallowedFeatureIds.length === 0) continue; // empty, or only allowed initial features

    findings.push({
      id: connector.id,
      supportedFeatureIds,
      disallowedFeatureIds,
      missingFromRefs,
      message:
        `Connector \`${connector.id}\` is not registered in Production-NonCanary ` +
        `(missing from ${missingFromRefs.map(shortSha).join(', ')}) but already declares ` +
        `feature(s) [${disallowedFeatureIds.join(', ')}]. Ship it with ` +
        `\`supportedFeatureIds: []\`${allowedHint} first; once it is registered in every ` +
        `Production-NonCanary version, add the remaining feature IDs in a follow-up PR.`,
    });
  }

  return { status: findings.length > 0 ? 'unsafe' : 'safe', findings, refs };
}

module.exports = {
  ALLOWED_INITIAL_FEATURE_IDS,
  classifyConnectorRelease,
};
