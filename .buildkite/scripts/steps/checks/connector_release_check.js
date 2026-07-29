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
 * release pointer moves both directions). The base branch is used only to scope
 * findings to connectors this PR actually changed.
 *
 * Manifest shape: { schemaVersion: '1', connectors: [{ id, supportedFeatureIds }] }.
 */

// ponytail: allowlist, not a config file — these are the only feature ids safe to
// ship on a not-yet-released connector because they don't persist rollback-fragile
// user actions. Add here if that ever changes.
const ALLOWED_INITIAL_FEATURE_IDS = ['agentBuilder'];

const byId = (manifest) => new Map((manifest?.connectors ?? []).map((c) => [c.id, c]));

const sameFeatures = (a, b) =>
  JSON.stringify([...(a ?? [])].sort()) === JSON.stringify([...(b ?? [])].sort());

/**
 * @param {object|null} head     manifest at the PR head (required)
 * @param {object|null} base     manifest at the merge-base (scoping only; may be null)
 * @param {object|null} released manifest at the serverless release SHA (may be null → fail-open)
 * @param {{ allowedInitialFeatures?: string[] }} [opts]
 * @returns {{ findings: Array<{id, supportedFeatureIds, disallowedFeatureIds, message}>, note?: string }}
 */
function classifyConnectorRelease(head, base, released, opts = {}) {
  const allowed = new Set(opts.allowedInitialFeatures ?? ALLOWED_INITIAL_FEATURE_IDS);
  const headMap = byId(head);
  const baseMap = byId(base);

  // Fail open: without a released baseline we cannot tell what is already shipped,
  // so we flag nothing and leave a note instead of blocking.
  if (released === null || released === undefined) {
    return {
      findings: [],
      note: 'Could not determine the connectors present in the current serverless release; skipping the 2-step release check for this run.',
    };
  }
  const releasedIds = new Set(byId(released).keys());

  const findings = [];
  for (const [id, headEntry] of headMap) {
    const baseEntry = baseMap.get(id);

    // Only evaluate connectors this PR introduces or whose features it changes.
    const changedByThisPr =
      baseEntry === undefined ||
      !sameFeatures(headEntry.supportedFeatureIds, baseEntry.supportedFeatureIds);
    if (!changedByThisPr) continue;

    // Already in a release → the type is handled by the deployed system; anything goes.
    if (releasedIds.has(id)) continue;

    const disallowedFeatureIds = (headEntry.supportedFeatureIds ?? []).filter(
      (f) => !allowed.has(f)
    );
    if (disallowedFeatureIds.length === 0) continue; // empty or only allowed initial features

    findings.push({
      id,
      supportedFeatureIds: headEntry.supportedFeatureIds ?? [],
      disallowedFeatureIds,
      message:
        `New connector \`${id}\` is not yet in the current serverless release but already declares ` +
        `feature(s) [${disallowedFeatureIds.join(', ')}]. Ship it support-only first ` +
        `(\`supportedFeatureIds: []\` or \`['${[...allowed].join("', '")}']\`), let it reach a ` +
        `release, then enable other features in a follow-up PR.`,
    });
  }

  return { findings };
}

module.exports = {
  ALLOWED_INITIAL_FEATURE_IDS,
  classifyConnectorRelease,
};
