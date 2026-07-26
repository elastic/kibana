/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Stamps a content-hash version onto the target directory's package.json.
 *
 * Identical builds → identical hash → identical version, which lets the
 * Artifactory publish step refuse duplicate uploads rather than creating
 * orphan revisions. The briefing mandates content-hash versioning; this
 * script is the single place where that hash is computed.
 *
 * Usage: node stamp_version.js <target-dir>
 *
 * Behavior:
 *   - Hashes every file in <target-dir> except package.json / metadata.json
 *     / any .tgz, to avoid self-referential hashing and to exclude files
 *     that are rewritten after this step runs.
 *   - Replaces the `version` field in <target-dir>/package.json with
 *     `0.0.0-<first-12-hex-chars-of-sha256>` (valid semver pre-release).
 *   - Respects BUILD_VERSION env var as an override; useful for local
 *     smoke testing and for emergencies where an exact version is needed.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const targetDir = process.argv[2];
if (!targetDir) {
  console.error('Usage: node stamp_version.js <target-dir>');
  process.exit(1);
}

const EXCLUDED = new Set(['package.json', 'metadata.json']);

function hashTarget(dir) {
  const hash = crypto.createHash('sha256');
  const entries = fs.readdirSync(dir).sort();
  for (const name of entries) {
    if (EXCLUDED.has(name) || name.endsWith('.tgz')) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isFile()) {
      hash.update(name);
      hash.update('\0');
      hash.update(fs.readFileSync(full));
      hash.update('\0');
    }
    // Intentionally shallow — target/ is flat post-build. Nested dirs would
    // indicate a layout change worth reviewing before silently including.
  }
  return hash.digest('hex');
}

const pkgPath = path.join(targetDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const version = process.env.BUILD_VERSION || `0.0.0-${hashTarget(targetDir).slice(0, 12)}`;
pkg.version = version;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

console.log(`    ${pkg.name}@${version}`);
