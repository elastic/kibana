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
 * A brand-new connector *type* must reach a shipped release before it can
 * declare user-facing features. Otherwise a user could create actions of a type
 * that vanishes on rollback, leaving those actions unresolvable. Once the type
 * exists in the released Kibana, anything else is safe (the deployed system can
 * already handle actions of that type), so this is an existence check only.
 *
 * The comparison target is the *current serverless release* (rollback-safe: the
 * release pointer moves both directions). Whether a connector already shipped is
 * decided by its spec file existing at the released ref (see run_connector_release_check.js).
 */

// ponytail: allowlist, not a config file — these are the only feature ids safe to
// ship on a not-yet-released connector because they don't persist rollback-fragile
// user actions.
// NOTE: `agentBuilder` is allowlisted only while the feature is not yet GA. Revisit
// and remove this entry once agentBuilder reaches GA.
const ALLOWED_INITIAL_FEATURE_IDS = ['agentBuilder'];

/**
 * @param {Array<{id: string, supportedFeatureIds?: string[], existsInRelease: boolean}>} changedConnectors
 *   Connectors whose spec files this PR changed. `existsInRelease` is true when the
 *   spec file was already present at the serverless release ref.
 * @param {boolean} releasedAvailable  false when the released ref could not be resolved → fail open
 * @param {{ allowedInitialFeatures?: string[] }} [opts]
 * @returns {{ findings: Array<{id, supportedFeatureIds, disallowedFeatureIds, message}>, note?: string }}
 */
function classifyConnectorRelease(changedConnectors, releasedAvailable, opts = {}) {
  const allowed = new Set(opts.allowedInitialFeatures ?? ALLOWED_INITIAL_FEATURE_IDS);

  // Fail open: without a released baseline we cannot tell what is already shipped,
  // so we flag nothing and leave a note instead of blocking.
  if (!releasedAvailable) {
    return {
      findings: [],
      note: 'Could not determine the connectors present in the current serverless release; skipping the 2-step release check for this run.',
    };
  }

  const findings = [];
  for (const connector of changedConnectors) {
    // Already in a release → the type is handled by the deployed system; anything goes.
    if (connector.existsInRelease) continue;

    const disallowedFeatureIds = (connector.supportedFeatureIds ?? []).filter(
      (f) => !allowed.has(f)
    );
    if (disallowedFeatureIds.length === 0) continue; // empty or only allowed initial features

    findings.push({
      id: connector.id,
      supportedFeatureIds: connector.supportedFeatureIds ?? [],
      disallowedFeatureIds,
      message:
        `New connector \`${connector.id}\` is not yet in the current serverless release but already declares ` +
        `feature(s) [${disallowedFeatureIds.join(
          ', '
        )}]. Ship it with no user-facing features first ` +
        `(\`supportedFeatureIds: []\`${
          allowed.size ? ` or \`['${[...allowed].join("', '")}']\`` : ''
        }), let it reach a release, then enable other features in a follow-up PR.`,
    });
  }

  return { findings };
}

module.exports = {
  ALLOWED_INITIAL_FEATURE_IDS,
  classifyConnectorRelease,
};
