/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const script = join(__dirname, 'isomer_studio_upload.sh');
const sha = 'a'.repeat(40);

describe('Studio CI preview upload', () => {
  let directory: string;
  let log: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'isomer-studio-upload-'));
    log = join(directory, 'commands.log');
    const bin = join(directory, 'bin');
    mkdirSync(bin);
    mkdirSync(join(directory, 'target/isomer-studio'), { recursive: true });
    writeFileSync(join(directory, 'target/isomer-studio/index.html'), '<!doctype html>');
    writeFileSync(
      join(directory, 'target/isomer-studio/build.json'),
      JSON.stringify({ sourceSha: sha })
    );
    mkdirSync(join(directory, '.buildkite/scripts/common'), { recursive: true });
    writeFileSync(
      join(directory, '.buildkite/scripts/common/activate_service_account.sh'),
      'printf "activate %s\\n" "$*" >> "$COMMAND_LOG"\n'
    );
    writeFileSync(join(bin, 'git'), `#!/bin/bash\nprintf '%s\\n' '${sha}'\n`, {
      mode: 0o755,
    });
    for (const command of ['gcloud', 'buildkite-agent']) {
      writeFileSync(
        join(bin, command),
        `#!/bin/bash
printf '${command} %s\\n' "$*" >> "$COMMAND_LOG"
if [[ '${command}' == gcloud && "\${FAIL_UPLOAD:-}" == true ]]; then exit 1; fi
`,
        { mode: 0o755 }
      );
    }
    env = {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      COMMAND_LOG: log,
      BUILDKITE_PULL_REQUEST: '302243',
      BUILDKITE_BUILD_ID: 'build-123',
      BUILDKITE_JOB_ID: 'job-456',
    };
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  const run = (cwd: string, environment: NodeJS.ProcessEnv) =>
    spawnSync('bash', [script], { cwd, env: environment, encoding: 'utf8' });

  it('uploads the whole site and advertises its checkout/build/job-scoped URL', () => {
    expect(run(directory, env).status).toBe(0);
    const commands = readFileSync(log, 'utf8');
    const path = `ci-artifacts.kibana.dev/isomer-studio/pr-302243/${sha}/build-123/job-456/`;
    expect(commands).toContain('activate gs://ci-artifacts.kibana.dev');
    expect(commands).toContain('--gzip-local=js,css,html,json,map,txt,svg');
    expect(commands).toContain(`--recursive --no-user-output-enabled * gs://${path}`);
    expect(commands).toContain(
      `meta-data set pr_comment:isomer_studio:head * [Isomer Studio Preview](https://${path})`
    );
    expect(commands).toContain('annotate --style info --context isomer-studio');
  });

  it('does not advertise a preview when uploading fails', () => {
    expect(run(directory, { ...env, FAIL_UPLOAD: 'true' }).status).not.toBe(0);
    expect(readFileSync(log, 'utf8')).not.toContain('buildkite-agent');
  });

  it('keeps retries in a separate job path', () => {
    expect(run(directory, { ...env, BUILDKITE_JOB_ID: 'retry-789' }).status).toBe(0);
    expect(readFileSync(log, 'utf8')).toContain(`/${sha}/build-123/retry-789/`);
  });

  it('refuses an incomplete site before activating credentials', () => {
    rmSync(join(directory, 'target/isomer-studio/build.json'));
    const result = run(directory, env);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Missing Studio site or build metadata');
  });

  it.each(['BUILDKITE_PULL_REQUEST', 'BUILDKITE_BUILD_ID', 'BUILDKITE_JOB_ID'])(
    'rejects unsafe path input in %s before activating credentials',
    (key) => {
      const result = run(directory, { ...env, [key]: '../other-preview' });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('Invalid Studio artifact identity');
    }
  );
});
