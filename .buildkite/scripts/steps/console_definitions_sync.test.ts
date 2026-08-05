/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import Path from 'path';

const REPO_ROOT = Path.resolve(__dirname, '../../..');
const SYNC_SCRIPT = Path.resolve(__dirname, 'console_definitions_sync.sh');
const DOC_LINKS_SYNC_SCRIPT = Path.resolve(__dirname, 'kibana_api_doc_links_sync.sh');
const PR_TITLE = '[Console] Update console definitions (main)';

const writeExecutable = (file: string, content: string) => {
  fs.writeFileSync(file, content);
  fs.chmodSync(file, 0o755);
};

const runSync = ({
  auditStatus,
  existingPr = false,
  script = SYNC_SCRIPT,
  statusOutput = ' M src/platform/plugins/shared/console/server/lib/spec_definitions/json/generated/search.json',
}: {
  auditStatus: number;
  existingPr?: boolean;
  script?: string;
  statusOutput?: string;
}) => {
  const root = fs.mkdtempSync(Path.join(os.tmpdir(), 'console-definitions-sync-'));
  const fakeBin = Path.resolve(root, 'bin');
  const kibanaDir = Path.resolve(root, 'kibana');
  const parentDir = Path.resolve(root, 'parent');
  fs.mkdirSync(fakeBin);
  fs.mkdirSync(parentDir);
  fs.mkdirSync(Path.resolve(kibanaDir, '.buildkite/scripts'), { recursive: true });
  writeExecutable(
    Path.resolve(kibanaDir, '.buildkite/scripts/bootstrap.sh'),
    '#!/usr/bin/env bash\n'
  );

  writeExecutable(
    Path.resolve(fakeBin, 'git'),
    `#!/usr/bin/env bash
if [[ "\${1:-} \${2:-}" == "status --porcelain" ]]; then
  printf '%s\n' "\${TEST_STATUS_OUTPUT}"
  exit 0
fi
exit 0
`
  );
  writeExecutable(
    Path.resolve(fakeBin, 'node'),
    `#!/usr/bin/env bash
if [[ "$*" == *"audit_console_definition_overrides.js"* ]]; then
  echo "Changed conflicts:"
  echo "  - watcher.put_watch::throttle_period"
  exit "\${TEST_AUDIT_STATUS}"
fi
exit 0
`
  );
  writeExecutable(
    Path.resolve(fakeBin, 'gh'),
    `#!/usr/bin/env bash
if [[ "\${1:-} \${2:-}" == "pr list" ]]; then
  if [[ "\${TEST_EXISTING_PR}" == "true" ]]; then
    echo "\${TEST_PR_TITLE}"
  fi
  exit 0
fi
if [[ "\${1:-} \${2:-}" == "pr create" ]]; then
  printf '%s\\n' "$*" > "\${TEST_ROOT}/pr-create-args"
  echo "https://github.com/elastic/kibana/pull/1"
  exit 0
fi
if [[ "\${1:-} \${2:-}" == "pr merge" ]]; then
  touch "\${TEST_ROOT}/merge-called"
  exit 0
fi
exit 0
`
  );
  writeExecutable(
    Path.resolve(fakeBin, 'buildkite-agent'),
    `#!/usr/bin/env bash
printf '%s\\n' "$*" > "\${TEST_ROOT}/buildkite-agent-args"
`
  );

  const result = spawnSync('bash', [script], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${fakeBin}:${process.env.PATH}`,
      PARENT_DIR: parentDir,
      KIBANA_DIR: kibanaDir,
      BUILDKITE_BRANCH: 'main',
      KIBANA_SLACK_NOTIFICATIONS_ENABLED: 'true',
      TEST_ROOT: root,
      TEST_AUDIT_STATUS: String(auditStatus),
      TEST_EXISTING_PR: String(existingPr),
      TEST_PR_TITLE: PR_TITLE,
      TEST_STATUS_OUTPUT: statusOutput,
    },
  });

  return {
    cleanup: () => fs.rmSync(root, { force: true, recursive: true }),
    output: `${result.stdout}${result.stderr}`,
    status: result.status,
    prCreateArgs: fs.existsSync(Path.resolve(root, 'pr-create-args'))
      ? fs.readFileSync(Path.resolve(root, 'pr-create-args'), 'utf8')
      : undefined,
    autoMergeCalled: fs.existsSync(Path.resolve(root, 'merge-called')),
    buildkiteAgentArgs: fs.existsSync(Path.resolve(root, 'buildkite-agent-args'))
      ? fs.readFileSync(Path.resolve(root, 'buildkite-agent-args'), 'utf8')
      : undefined,
  };
};

describe('WHEN Console definitions are synchronized', () => {
  it('SHOULD open an audit-report PR without auto-merge and fail the build', () => {
    const result = runSync({ auditStatus: 1 });
    try {
      expect(result.status).toBe(1);
      expect(result.prCreateArgs).toContain('Override conflict audit');
      expect(result.prCreateArgs).toContain('watcher.put_watch::throttle_period');
      expect(result.autoMergeCalled).toBe(false);
    } finally {
      result.cleanup();
    }
  });

  it('SHOULD keep auto-merge enabled when the audit passes', () => {
    const result = runSync({ auditStatus: 0 });
    try {
      expect(result.status).toBe(0);
      expect(result.prCreateArgs).not.toContain('Override conflict audit');
      expect(result.autoMergeCalled).toBe(true);
      expect(result.prCreateArgs).toContain('--label backport:skip');
    } finally {
      result.cleanup();
    }
  });

  it('SHOULD open a PR when generation only adds new scoped files', () => {
    const result = runSync({
      auditStatus: 0,
      statusOutput:
        '?? src/platform/plugins/shared/console/server/lib/spec_definitions/json/generated/new_endpoint.json',
    });
    try {
      expect(result.status).toBe(0);
      expect(result.prCreateArgs).toContain('[Console] Update console definitions (main)');
      expect(result.autoMergeCalled).toBe(true);
    } finally {
      result.cleanup();
    }
  });

  it('SHOULD remind the team instead of opening a duplicate unsafe PR', () => {
    const result = runSync({ auditStatus: 1, existingPr: true });
    try {
      expect(result.status).toBe(1);
      expect(result.prCreateArgs).toBeUndefined();
      expect(result.autoMergeCalled).toBe(false);
      expect(result.buildkiteAgentArgs).toContain('slack:console_defs_existing_pr:body');
    } finally {
      result.cleanup();
    }
  });

  it('SHOULD preserve API doc-links PR labels and auto-merge behavior', () => {
    const result = runSync({ auditStatus: 0, script: DOC_LINKS_SYNC_SCRIPT });
    try {
      expect(result.status).toBe(0);
      expect(result.prCreateArgs).toContain('[Console] Update Kibana API doc links (main)');
      expect(result.prCreateArgs).toContain('--label backport:skip');
      expect(result.autoMergeCalled).toBe(true);
    } finally {
      result.cleanup();
    }
  });
});
