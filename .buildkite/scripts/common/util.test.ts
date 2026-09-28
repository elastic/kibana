/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Crypto from 'crypto';
import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import { spawnSync } from 'child_process';

const UTIL_PATH = Path.resolve(__dirname, './util.sh');
const BUILD_ID = 'current-build';
const BUCKET = 'kibana-ci-artifacts-us-central1';

const writeExecutable = (targetPath: string, contents: string) => {
  Fs.writeFileSync(targetPath, contents, { mode: 0o755 });
};

const createMockBinaries = (binDir: string) => {
  writeExecutable(
    Path.join(binDir, 'buildkite-agent'),
    `#!/usr/bin/env bash
set -euo pipefail
echo "buildkite-agent $*" >> "$CALLS_FILE"
case "$1 $2" in
  "meta-data set") echo "$3=$4" >> "$META_FILE" ;;
  "meta-data get") grep -F "$3=" "$META_FILE" | tail -n 1 | cut -d= -f2- || true ;;
  "artifact shasum") echo "\${MOCK_SHASUM:-}" ;;
esac
`
  );

  writeExecutable(
    Path.join(binDir, 'gcloud'),
    `#!/usr/bin/env bash
set -euo pipefail
echo "gcloud $*" >> "$CALLS_FILE"
if [[ "$1 $2" == "auth login" ]]; then
  [[ "\${GOOGLE_EXTERNAL_ACCOUNT_ALLOW_EXECUTABLES:-}" == "1" ]]
elif [[ "$1 $2" == "storage cp" ]]; then
  src="\${3/gs:\\/\\//$FAKE_GCS/}"
  dest="\${4/gs:\\/\\//$FAKE_GCS/}"
  mkdir -p "$(dirname "$dest")"
  cp "$src" "$dest"
fi
`
  );

  writeExecutable(
    Path.join(binDir, 'timeout'),
    `#!/usr/bin/env bash
shift
exec "$@"
`
  );
};

const setupSandbox = () => {
  const root = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'kibana-buildkite-util-'));
  const dirs = {
    root,
    bin: Path.join(root, 'bin'),
    gcs: Path.join(root, 'gcs'),
    checkout: Path.join(root, 'checkout'),
    gcloudConfig: Path.join(root, 'gcloud-config'),
    wifCredentials: Path.join(root, 'wif-credentials'),
  };
  Object.values(dirs).forEach((dir) => Fs.mkdirSync(dir, { recursive: true }));
  Fs.writeFileSync(Path.join(dirs.gcloudConfig, 'config'), '');
  createMockBinaries(dirs.bin);

  const callsFile = Path.join(root, 'calls.log');
  const metaFile = Path.join(root, 'meta-data');
  Fs.writeFileSync(callsFile, '');
  Fs.writeFileSync(metaFile, '');

  const run = (script: string, env: Record<string, string> = {}) => {
    const result = spawnSync(
      'bash',
      ['-c', `set -euo pipefail; source "${UTIL_PATH}"; ${script}`],
      {
        cwd: dirs.checkout,
        encoding: 'utf-8',
        env: {
          ...process.env,
          PATH: `${dirs.bin}:${process.env.PATH ?? ''}`,
          CALLS_FILE: callsFile,
          META_FILE: metaFile,
          FAKE_GCS: dirs.gcs,
          CLOUDSDK_CONFIG: dirs.gcloudConfig,
          KIBANA_WIF_CREDENTIALS_DIR: dirs.wifCredentials,
          GOOGLE_EXTERNAL_ACCOUNT_ALLOW_EXECUTABLES: '1',
          BUILDKITE_AGENT_GCP_REGION: 'us-central1',
          BUILDKITE_BUILD_ID: BUILD_ID,
          ...env,
        },
      }
    );
    const calls = Fs.readFileSync(callsFile, 'utf-8').split('\n').filter(Boolean);
    return { ...result, calls };
  };

  const putGcsObject = (buildId: string, name: string, contents: string) => {
    const target = Path.join(dirs.gcs, BUCKET, 'tmp/builds', buildId, name);
    Fs.mkdirSync(Path.dirname(target), { recursive: true });
    Fs.writeFileSync(target, contents);
  };

  const cleanup = () => Fs.rmSync(root, { recursive: true, force: true });

  return { dirs, run, putGcsObject, cleanup };
};

const sha256 = (contents: string) => Crypto.createHash('sha256').update(contents).digest('hex');

describe('tmp artifact helpers', () => {
  let sandbox: ReturnType<typeof setupSandbox>;

  beforeEach(() => {
    sandbox = setupSandbox();
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  it('records a checksum on upload that a download from the same build accepts', () => {
    const { dirs, run } = sandbox;
    Fs.writeFileSync(Path.join(dirs.root, 'run_order.json'), '{"groups":[]}');

    const upload = run(
      `upload_tmp_artifact "${dirs.root}/run_order.json" run_order.json "${BUILD_ID}"`
    );
    expect(upload.status).toBe(0);
    expect(upload.calls).toContain(
      `buildkite-agent meta-data set tmp-artifact-sha256:run_order.json ${sha256('{"groups":[]}')}`
    );

    const download = run(`download_tmp_artifact run_order.json . "${BUILD_ID}"`);
    expect(download.status).toBe(0);
    expect(Fs.readFileSync(Path.join(dirs.checkout, 'run_order.json'), 'utf-8')).toBe(
      '{"groups":[]}'
    );
    expect(download.calls.some((call) => call.includes('artifact download'))).toBe(false);
  });

  it('discards a GCS object whose checksum does not match and falls back to buildkite', () => {
    const { dirs, run, putGcsObject } = sandbox;
    Fs.writeFileSync(
      Path.join(dirs.root, 'meta-data'),
      `tmp-artifact-sha256:a.json=${sha256('expected')}\n`
    );
    putGcsObject(BUILD_ID, 'a.json', 'different');

    const result = run(`download_tmp_artifact a.json . "${BUILD_ID}"`);

    expect(result.status).toBe(0);
    expect(result.stderr).toContain('Checksum mismatch for a.json');
    expect(Fs.existsSync(Path.join(dirs.checkout, 'a.json'))).toBe(false);
    expect(result.calls).toContain(
      `buildkite-agent artifact download a.json . --build ${BUILD_ID}`
    );
  });

  it('fails without fallback when the checksum does not match', () => {
    const { dirs, run, putGcsObject } = sandbox;
    Fs.writeFileSync(
      Path.join(dirs.root, 'meta-data'),
      `tmp-artifact-sha256:a.json=${sha256('expected')}\n`
    );
    putGcsObject(BUILD_ID, 'a.json', 'different');

    const result = run(`download_tmp_artifact a.json . "${BUILD_ID}" false`);

    expect(result.status).not.toBe(0);
    expect(Fs.existsSync(Path.join(dirs.checkout, 'a.json'))).toBe(false);
  });

  it('skips GCS when the build recorded no checksum', () => {
    const { run, putGcsObject } = sandbox;
    putGcsObject(BUILD_ID, 'moon-cache.tar.zst', 'anything');

    const result = run(`download_tmp_artifact moon-cache.tar.zst . "${BUILD_ID}" false`);

    expect(result.status).not.toBe(0);
    expect(result.calls.some((call) => call.startsWith('gcloud storage cp'))).toBe(false);
  });

  it('verifies artifacts of other builds against the buildkite artifact checksum', () => {
    const { dirs, run, putGcsObject } = sandbox;
    putGcsObject('other-build', 'kibana-default.tar.zst', 'distributable');

    const result = run(`download_tmp_artifact kibana-default.tar.zst . other-build`, {
      MOCK_SHASUM: sha256('distributable'),
    });

    expect(result.status).toBe(0);
    expect(result.calls).toContain(
      'buildkite-agent artifact shasum --sha256 --build other-build kibana-default.tar.zst'
    );
    expect(Fs.readFileSync(Path.join(dirs.checkout, 'kibana-default.tar.zst'), 'utf-8')).toBe(
      'distributable'
    );
  });
});

describe('extract_moon_cache', () => {
  let sandbox: ReturnType<typeof setupSandbox>;
  let source: string;

  const createArchive = (entries: string[]) => {
    const archive = Path.join(sandbox.dirs.root, 'moon-cache.tar.zst');
    const result = spawnSync('tar', ['-cf', archive, '--zstd', ...entries], {
      cwd: source,
      encoding: 'utf-8',
    });
    expect(result.status).toBe(0);
    return archive;
  };

  beforeEach(() => {
    sandbox = setupSandbox();
    source = Path.join(sandbox.dirs.root, 'source');
    Fs.mkdirSync(Path.join(source, '.moon/cache/hashes'), { recursive: true });
    Fs.writeFileSync(Path.join(source, '.moon/cache/hashes/abc.json'), '{}');
    Fs.writeFileSync(Path.join(source, 'package.json'), 'replaced');
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  it('restores .moon/cache', () => {
    const archive = createArchive(['.moon/cache']);

    const result = sandbox.run(`extract_moon_cache "${archive}"`);

    expect(result.status).toBe(0);
    expect(
      Fs.readFileSync(Path.join(sandbox.dirs.checkout, '.moon/cache/hashes/abc.json'), 'utf-8')
    ).toBe('{}');
    expect(Fs.readdirSync(Path.join(sandbox.dirs.checkout, '.moon'))).toEqual(['cache']);
  });

  it('refuses archives with entries outside .moon/cache', () => {
    const archive = createArchive(['.moon/cache', 'package.json']);

    const result = sandbox.run(`extract_moon_cache "${archive}"`);

    expect(result.status).not.toBe(0);
    expect(Fs.existsSync(Path.join(sandbox.dirs.checkout, 'package.json'))).toBe(false);
    expect(Fs.existsSync(Path.join(sandbox.dirs.checkout, '.moon/cache'))).toBe(false);
  });

  it('refuses archives containing links', () => {
    Fs.symlinkSync(sandbox.dirs.root, Path.join(source, '.moon/cache/linked'));
    const archive = createArchive(['.moon/cache']);

    const result = sandbox.run(`extract_moon_cache "${archive}"`);

    expect(result.status).not.toBe(0);
    expect(Fs.existsSync(Path.join(sandbox.dirs.checkout, '.moon/cache'))).toBe(false);
  });
});
