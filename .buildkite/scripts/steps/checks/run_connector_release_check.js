#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Runs the connector 2-step release check and writes an advisory report.
 *
 * Reads the committed connector release manifest at three points:
 *   - head:     the working-copy file
 *   - base:     the merge-base ref (scoping only)
 *   - released: the current serverless release SHA (rollback-safe target)
 *
 * This never fails the build — it only produces a report for the notifier.
 *
 * Usage:
 *   node run_connector_release_check.js \
 *     --report-path <file> [--base-ref <sha>] [--released-ref <sha>]
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { classifyConnectorRelease } = require('./connector_release_check');

const MANIFEST_PATH =
  'src/platform/packages/shared/kbn-connector-specs/connector_release_manifest.json';

const REPO_ROOT = path.resolve(__dirname, '../../../..');

const parseFlag = (name) => {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
};

const parseJson = (raw, label) => {
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`Could not parse ${label} manifest as JSON: ${err.message}`);
    return null;
  }
};

const readWorkingCopy = () => {
  const abs = path.join(REPO_ROOT, MANIFEST_PATH);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
};

const readAtRef = (ref) => {
  if (!ref) return null;
  try {
    return execFileSync('git', ['show', `${ref}:${MANIFEST_PATH}`], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch (err) {
    // File absent at that ref (e.g. release predates the manifest) → treat as unavailable.
    return null;
  }
};

const main = () => {
  const reportPath = parseFlag('report-path');
  if (!reportPath) {
    console.error(
      'Usage: run_connector_release_check --report-path <file> [--base-ref <sha>] [--released-ref <sha>]'
    );
    process.exit(2);
  }

  const baseRef = parseFlag('base-ref');
  const releasedRef = parseFlag('released-ref');

  const head = parseJson(readWorkingCopy(), 'head');
  const base = parseJson(readAtRef(baseRef), 'base');
  const released = parseJson(readAtRef(releasedRef), 'released');

  if (head === null) {
    // No manifest in this PR → nothing to check.
    fs.writeFileSync(
      reportPath,
      JSON.stringify({ findings: [], note: 'No connector release manifest present.' }, null, 2)
    );
    return;
  }

  const { findings, note } = classifyConnectorRelease(head, base, released);

  const report = {
    findings,
    note,
    baseRef: baseRef ?? null,
    releasedRef: releasedRef ?? null,
    releasedManifestAvailable: released !== null,
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(
    `Connector release check: ${findings.length} advisory finding(s)` + (note ? ` (${note})` : '')
  );
};

main();
