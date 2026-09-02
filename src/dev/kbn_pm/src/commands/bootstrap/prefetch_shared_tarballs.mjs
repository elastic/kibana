/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fsp from 'fs/promises';
import Crypto from 'crypto';
import Os from 'os';

import { REPO_ROOT } from '../../lib/paths.mjs';
import { run } from '../../lib/spawn.mjs';

const MIRROR_DIR = Path.resolve(REPO_ROOT, '.yarn-local-mirror');

/**
 * @typedef {{ url: string, integrity: string, name: string, version: string }} SharedTarball
 */

/**
 * Extract package name and version from a registry tarball URL, e.g.
 * https://registry.npmjs.org/redux-thunk/-/redux-thunk-2.4.2.tgz
 * https://registry.yarnpkg.com/@reduxjs/toolkit/-/toolkit-1.9.7.tgz
 * @param {string} url
 * @returns {{ name: string, version: string } | undefined}
 */
function parseRegistryUrl(url) {
  const match = new URL(url).pathname.match(
    /^\/((?:@[^/]+\/)?[^/]+)\/-\/[^/]+-(\d+\.\d+\.\d+(?:-[^/]+)?)\.tgz$/
  );
  if (!match) return undefined;
  return { name: match[1], version: match[2] };
}

/**
 * Parse yarn.lock (dependency-free) and return tarball URLs which are
 * referenced by more than one lockfile entry.
 * @returns {Promise<SharedTarball[]>}
 */
export async function findSharedTarballs() {
  const lock = await Fsp.readFile(Path.resolve(REPO_ROOT, 'yarn.lock'), 'utf8');

  /** @type {Map<string, { integrity: string, count: number }>} */
  const byUrl = new Map();
  for (const block of lock.split('\n\n')) {
    const resolved = block.match(/^ {2}resolved "([^"]+)"/m)?.[1];
    const integrity = block.match(/^ {2}integrity (\S+)/m)?.[1];
    if (!resolved || !integrity) continue;
    const url = resolved.split('#')[0];
    const existing = byUrl.get(url);
    byUrl.set(url, { integrity, count: (existing?.count ?? 0) + 1 });
  }

  /** @type {SharedTarball[]} */
  const shared = [];
  for (const [url, { integrity, count }] of byUrl) {
    if (count < 2) continue;
    const parsed = parseRegistryUrl(url);
    if (parsed) shared.push({ url, integrity, ...parsed });
  }
  return shared;
}

/**
 * Filename yarn classic uses inside the offline mirror: package name with
 * "/" replaced by "-" (scoped packages), followed by the version.
 * e.g. @elastic/kibana-d3-color@2.0.1 -> @elastic-kibana-d3-color-2.0.1.tgz
 * @param {SharedTarball} tarball
 */
function mirrorFilename({ name, version }) {
  return `${name.replace('/', '-')}-${version}.tgz`;
}

/**
 * Verify a buffer against an SSRI integrity string (e.g. "sha512-<b64> sha1-<b64>").
 * @param {Buffer} buffer
 * @param {string} integrity
 */
function isValid(buffer, integrity) {
  for (const entry of integrity.split(/\s+/)) {
    const dash = entry.indexOf('-');
    if (dash === -1) continue;
    const algo = entry.slice(0, dash);
    const expected = entry.slice(dash + 1);
    try {
      const actual = Crypto.createHash(algo).update(buffer).digest('base64');
      return actual === expected;
    } catch {
      // unsupported algo in this entry, try the next one
    }
  }
  return false;
}

/**
 * Pre-populate `.yarn-local-mirror` with tarballs that are referenced by more
 * than one yarn.lock entry (e.g. `npm:` alias + plain selector pairs like
 * `redux-thunk-v2` / `redux-thunk@^2.4.2`).
 *
 * yarn classic fetches once per lockfile entry, so two entries sharing one
 * tarball race on the same mirror/cache path during cold installs and can
 * observe a partially written file, failing with "Integrity check failed"
 * where the computed digest is the hash of an empty stream
 * (https://github.com/yarnpkg/yarn/issues/6407, fixed only in yarn 2+).
 *
 * With `--install.prefer-offline` (repo .yarnrc) a valid pre-existing mirror
 * file turns both fetch tasks into reads, eliminating the write race. This
 * also heals zero-byte/corrupt tarballs persisted in shared agent mirrors.
 *
 * Fetching is delegated to yarn itself (registry config, proxies, retries)
 * via a throwaway install with a temp-local mirror; verified tarballs are
 * then atomically renamed into the real mirror so concurrent readers never
 * observe a partial file.
 *
 * @param {import('@kbn/some-dev-log').SomeDevLog} log
 */
export async function prefetchSharedTarballs(log) {
  const shared = await findSharedTarballs();
  if (!shared.length) return;

  // resolve through a potential symlink (CI RAM-disk agents symlink the
  // mirror into the shared agent cache) so the atomic rename below stays on
  // the same filesystem as the final destination
  await Fsp.mkdir(MIRROR_DIR, { recursive: true });
  const mirrorReal = await Fsp.realpath(MIRROR_DIR);

  /** @type {SharedTarball[]} */
  const missing = [];
  for (const tarball of shared) {
    const dest = Path.resolve(mirrorReal, mirrorFilename(tarball));
    const existing = await Fsp.readFile(dest).catch(() => null);
    if (existing && isValid(existing, tarball.integrity)) continue;
    if (existing !== null) {
      log.warning(`mirror tarball is corrupt, refetching: ${Path.basename(dest)}`);
    }
    missing.push(tarball);
  }
  if (!missing.length) {
    log.debug(`all ${shared.length} shared tarball(s) already present in the offline mirror`);
    return;
  }

  log.info(
    `prefetching ${missing.length} shared tarball(s) into the offline mirror: ${missing
      .map((t) => `${t.name}@${t.version}`)
      .join(', ')}`
  );

  const tmpDir = await Fsp.mkdtemp(Path.resolve(Os.tmpdir(), 'kbn-mirror-prefetch-'));
  try {
    const tmpMirror = Path.resolve(tmpDir, 'mirror');
    await Fsp.mkdir(tmpMirror);

    // one request per package name => one lockfile entry per tarball => yarn
    // fetches each tarball exactly once, race-free. A temp .yarnrc scopes the
    // offline mirror to the temp dir and shields the run from the repo config.
    await Fsp.writeFile(
      Path.resolve(tmpDir, 'package.json'),
      JSON.stringify({
        name: 'kbn-mirror-prefetch',
        version: '0.0.0',
        private: true,
        dependencies: Object.fromEntries(missing.map((t) => [t.name, t.version])),
      })
    );
    await Fsp.writeFile(
      Path.resolve(tmpDir, '.yarnrc'),
      `yarn-offline-mirror "${tmpMirror}"\nignore-scripts true\n`
    );

    await run(
      'yarn',
      ['install', '--non-interactive', '--no-lockfile', '--ignore-engines', '--ignore-optional'],
      { cwd: tmpDir }
    );

    for (const tarball of missing) {
      const filename = mirrorFilename(tarball);
      const src = Path.resolve(tmpMirror, filename);
      const buffer = await Fsp.readFile(src);
      if (!isValid(buffer, tarball.integrity)) {
        throw new Error(
          `prefetched tarball for ${tarball.name}@${tarball.version} does not match the integrity recorded in yarn.lock`
        );
      }
      // stage next to the destination, then atomically rename over it so a
      // concurrent reader only ever sees a complete file
      const staging = Path.resolve(mirrorReal, `.${filename}.prefetch-${process.pid}`);
      await Fsp.copyFile(src, staging);
      await Fsp.rename(staging, Path.resolve(mirrorReal, filename));
      log.debug(`prefetched ${filename}`);
    }

    log.success(`prefetched ${missing.length} shared tarball(s)`);
  } finally {
    await Fsp.rm(tmpDir, { recursive: true, force: true });
  }
}
