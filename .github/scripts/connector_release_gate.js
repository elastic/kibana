/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Two-step release gate for connector spec PRs.
 *
 * State machine enforced: absent → support-only → feature-enabled
 *
 * This script runs from BASE-branch code only (pull_request_target).
 * It reads the committed connector_execution_manifest.json from the PR head
 * and the production manifest from the connector-production-manifest branch
 * via the GitHub API — no PR code is ever executed here.
 */

const MANIFEST_PATH =
  'src/platform/packages/shared/kbn-connector-specs/connector_execution_manifest.json';
const PRODUCTION_MANIFEST_BRANCH = 'connector-production-manifest';

const FINGERPRINT_RE = /^[0-9a-f]{64}$/;
const COMMIT_RE = /^[0-9a-f]{40}$/;

// ---------------------------------------------------------------------------
// Manifest validation
// ---------------------------------------------------------------------------

/**
 * Validates a parsed manifest object. Returns an array of error strings;
 * empty means valid.
 */
function validateManifest(manifest, label) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return [`${label}: must be an object`];
  }
  if (manifest.schemaVersion !== '1') {
    return [`${label}: schemaVersion must be "1", got ${JSON.stringify(manifest.schemaVersion)}`];
  }
  if (!Array.isArray(manifest.connectors)) {
    return [`${label}: connectors must be an array`];
  }
  if (manifest.deployedCommit !== undefined && !COMMIT_RE.test(manifest.deployedCommit)) {
    return [`${label}: deployedCommit must be a 40-character lowercase git SHA`];
  }

  const seen = new Set();
  for (const c of manifest.connectors) {
    if (!c.id || typeof c.id !== 'string') {
      return [`${label}: connector has missing or invalid id`];
    }
    if (seen.has(c.id)) {
      return [`${label}: duplicate connector id "${c.id}"`];
    }
    seen.add(c.id);

    if (!Array.isArray(c.supportedFeatureIds)) {
      return [`${label}: ${c.id} is missing supportedFeatureIds (must be an array)`];
    }
    if (c.supportedFeatureIds.some((f) => typeof f !== 'string')) {
      return [`${label}: ${c.id} supportedFeatureIds must be an array of strings`];
    }
    if (!FINGERPRINT_RE.test(c.executionFingerprint)) {
      return [
        `${label}: ${c.id} has an invalid executionFingerprint` +
          ' (expected 64 lowercase hex characters)',
      ];
    }
  }
  return [];
}

// ---------------------------------------------------------------------------
// Manifest change classification
// ---------------------------------------------------------------------------

function classifyChanges(baseManifest, headManifest) {
  const byId = (entries) => new Map(entries.map((e) => [e.id, e]));
  const baseMap = byId(baseManifest.connectors);
  const headMap = byId(headManifest.connectors);
  const allIds = new Set([...baseMap.keys(), ...headMap.keys()]);

  const changes = [];
  for (const id of allIds) {
    const base = baseMap.get(id) ?? null;
    const head = headMap.get(id) ?? null;

    let kind;
    if (base === null) {
      kind = 'new';
    } else if (head === null) {
      kind = 'removed';
    } else {
      const fpChanged = base.executionFingerprint !== head.executionFingerprint;
      const featuresChanged =
        JSON.stringify([...base.supportedFeatureIds].sort()) !==
        JSON.stringify([...head.supportedFeatureIds].sort());

      if (fpChanged && featuresChanged) kind = 'fingerprint_and_features_changed';
      else if (fpChanged) kind = 'fingerprint_changed';
      else if (featuresChanged) kind = 'features_only';
      else kind = 'unchanged';
    }

    changes.push({ id, kind, head, base });
  }
  return changes;
}

// ---------------------------------------------------------------------------
// Gate policy
// ---------------------------------------------------------------------------

/**
 * Apply the two-step release gate policy.
 *
 * State machine: absent → support-only (supportedFeatureIds: []) → feature-enabled (any feature)
 *
 * - New connector with [] passes.
 * - New connector with any feature fails (must ship support-only first).
 * - For existing connectors, production proof is required when:
 *     addedFeatures.length > 0
 *     OR (fingerprintChanged AND head still has features).
 * - Pure feature removal, fp change on a support-only connector, or unchanged → pass.
 *
 * Production proof: manifest exists, connector is present, fingerprints match.
 */
function checkReleaseGate(changes, prodManifest) {
  const violations = [];

  for (const change of changes) {
    const { id, kind, head, base } = change;

    if (kind === 'unchanged' || kind === 'removed' || head === null) continue;

    if (kind === 'new') {
      if (head.supportedFeatureIds.length > 0) {
        violations.push({
          connectorId: id,
          reason:
            `Connector ${id} is new and already declares feature(s) ` +
            `[${head.supportedFeatureIds.join(', ')}]. ` +
            'Ship a support-only version first (supportedFeatureIds: []), wait for it to ' +
            'reach Production-NonCanary, then add features in a follow-up PR.',
        });
      }
      continue;
    }

    // Existing connector: determine whether production proof is required.
    const baseFeatures = new Set(base.supportedFeatureIds);
    const addedFeatures = head.supportedFeatureIds.filter((f) => !baseFeatures.has(f));
    const fingerprintChanged = base.executionFingerprint !== head.executionFingerprint;
    const requiresProductionProof =
      addedFeatures.length > 0 || (fingerprintChanged && head.supportedFeatureIds.length > 0);

    if (!requiresProductionProof) continue;

    if (prodManifest === null) {
      violations.push({
        connectorId: id,
        reason:
          `Could not load the Production-NonCanary manifest. Cannot verify that connector ` +
          `${id} is deployed. Fix the manifest loading issue and retry.`,
      });
      continue;
    }

    const prodEntry = prodManifest.connectors.find((c) => c.id === id);
    if (!prodEntry) {
      violations.push({
        connectorId: id,
        reason:
          `Connector ${id} requires production proof but is not present in the ` +
          'Production-NonCanary manifest. Ship a support-only version first ' +
          '(supportedFeatureIds: []), wait for it to reach Production-NonCanary, ' +
          'then add features.',
      });
      continue;
    }

    if (prodEntry.executionFingerprint !== head.executionFingerprint) {
      violations.push({
        connectorId: id,
        reason:
          `Connector ${id} requires a matching production fingerprint, but the PR ` +
          `(${head.executionFingerprint.slice(0, 12)}…) does not match ` +
          `Production-NonCanary (${prodEntry.executionFingerprint.slice(0, 12)}…). ` +
          'The support-only version with the updated execution surface must reach ' +
          'Production-NonCanary before features can be added.',
      });
    }
  }

  return { pass: violations.length === 0, violations };
}

// ---------------------------------------------------------------------------
// GitHub API helpers
// ---------------------------------------------------------------------------

const getRepositoryFile = async ({ github, owner, repo, path, ref }) => {
  try {
    const { data } = await github.rest.repos.getContent({ owner, repo, path, ref });
    if (Array.isArray(data) || data.type !== 'file' || typeof data.content !== 'string') {
      throw new Error(`Expected ${path} at ${ref} to be a file`);
    }
    return Buffer.from(data.content, data.encoding ?? 'base64').toString('utf8');
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
};

// ---------------------------------------------------------------------------
// Entry point called by the workflow
// ---------------------------------------------------------------------------

const runConnectorReleaseGate = async ({ github, context, core }) => {
  const { owner, repo } = context.repo;
  const pullRequest = context.payload.pull_request;

  const [baseRaw, headRaw] = await Promise.all([
    getRepositoryFile({
      github,
      owner,
      repo,
      path: MANIFEST_PATH,
      ref: pullRequest.base.sha,
    }),
    getRepositoryFile({
      github,
      owner,
      repo,
      path: MANIFEST_PATH,
      ref: pullRequest.head.sha,
    }),
  ]);

  if (baseRaw === null && headRaw === null) {
    core.info('connector_execution_manifest.json not present in base or head — nothing to check');
    return;
  }

  // Parse and validate base manifest. Absent = empty manifest (first-ever connector PR).
  let baseManifest;
  if (baseRaw === null) {
    baseManifest = { schemaVersion: '1', connectors: [] };
  } else {
    try {
      baseManifest = JSON.parse(baseRaw);
    } catch {
      core.setFailed('Base manifest is not valid JSON');
      return;
    }
    const baseErrors = validateManifest(baseManifest, 'base');
    if (baseErrors.length > 0) {
      core.setFailed(`Base manifest is malformed: ${baseErrors.join('; ')}`);
      return;
    }
  }

  // Parse and validate head manifest. Deleted = hard failure.
  if (headRaw === null) {
    core.setFailed(
      'connector_execution_manifest.json was deleted in this PR. ' +
        'Run `node scripts/generate_connector_manifest` and commit the result.'
    );
    return;
  }
  let headManifest;
  try {
    headManifest = JSON.parse(headRaw);
  } catch {
    core.setFailed('Head manifest is not valid JSON');
    return;
  }
  const headErrors = validateManifest(headManifest, 'head');
  if (headErrors.length > 0) {
    core.setFailed(`Head manifest is malformed: ${headErrors.join('; ')}`);
    return;
  }

  const changes = classifyChanges(baseManifest, headManifest);
  const relevantChanges = changes.filter((c) => c.kind !== 'unchanged' && c.kind !== 'removed');

  if (relevantChanges.length === 0) {
    core.info('No new or modified connectors — release gate passed');
    return;
  }

  // Load production manifest. Malformed = hard failure. Missing = null (fail-closed per connector).
  let prodManifest = null;
  try {
    const prodRaw = await getRepositoryFile({
      github,
      owner,
      repo,
      path: MANIFEST_PATH,
      ref: `refs/heads/${PRODUCTION_MANIFEST_BRANCH}`,
    });
    if (prodRaw !== null) {
      let parsed;
      try {
        parsed = JSON.parse(prodRaw);
      } catch {
        core.setFailed('Production manifest is not valid JSON');
        return;
      }
      const prodErrors = validateManifest(parsed, 'production');
      if (prodErrors.length > 0) {
        core.setFailed(`Production manifest is malformed: ${prodErrors.join('; ')}`);
        return;
      }
      prodManifest = parsed;
    }
  } catch (err) {
    core.warning(`Could not load production manifest: ${err.message}`);
    // prodManifest stays null — checkReleaseGate fails closed for connectors needing proof.
  }

  const { pass, violations } = checkReleaseGate(changes, prodManifest);

  if (pass) {
    core.info(
      `Release gate passed for ${relevantChanges.length} changed connector(s): ` +
        relevantChanges.map((c) => c.id).join(', ')
    );
    return;
  }

  core.setFailed(
    `Connector release gate failed:\n\n${violations.map((v) => `• ${v.reason}`).join('\n')}`
  );
};

module.exports = {
  validateManifest,
  classifyChanges,
  checkReleaseGate,
  runConnectorReleaseGate,
};
