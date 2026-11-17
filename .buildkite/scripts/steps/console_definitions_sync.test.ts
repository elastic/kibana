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
const REMINDER_SCRIPT = Path.resolve(__dirname, 'console_definitions/sync_reminder.sh');
const PR_TITLE = '[Console] Update console definitions (main)';
const PR_URL = 'https://github.com/elastic/kibana/pull/42';

const readIfExists = (file: string) =>
  fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : undefined;

const writeExecutable = (file: string, content: string) => {
  fs.writeFileSync(file, content);
  fs.chmodSync(file, 0o755);
};

const runSync = ({
  existingPr = false,
  prListFails = false,
  reminderMode = '',
  script = SYNC_SCRIPT,
  statusOutput = ' M src/platform/plugins/shared/console/server/lib/spec_definitions/json/generated/search.json',
}: {
  existingPr?: boolean;
  prListFails?: boolean;
  reminderMode?: string;
  script?: string;
  statusOutput?: string;
} = {}) => {
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
  writeExecutable(Path.resolve(fakeBin, 'node'), '#!/usr/bin/env bash\nexit 0\n');
  writeExecutable(
    Path.resolve(fakeBin, 'gh'),
    `#!/usr/bin/env bash
if [[ "\${1:-} \${2:-}" == "pr list" ]]; then
  printf '%s\\n' "$*" > "\${TEST_ROOT}/pr-list-args"
  if [[ "\${TEST_PR_LIST_FAILS}" == "true" ]]; then
    echo "HTTP 401: Bad credentials" >&2
    exit 1
  fi
  printf '%s\\t%s\\n' "[Console] Update console definitions (9.6)" "https://github.com/elastic/kibana/pull/7"
  if [[ "\${TEST_EXISTING_PR}" == "true" ]]; then
    printf '%s\\t%s\\n' "\${TEST_PR_TITLE}" "\${TEST_PR_URL}"
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
if [[ "\${1:-} \${2:-}" == "pipeline upload" ]]; then
  cp "\${3}" "\${TEST_ROOT}/uploaded-pipeline.yml"
fi
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
      ELASTIC_SLACK_NOTIFICATIONS_ENABLED: 'true',
      SLACK_NOTIFICATIONS_CHANNEL: '#kibana-management',
      SYNC_REMINDER_MODE: reminderMode,
      TEST_ROOT: root,
      TEST_EXISTING_PR: String(existingPr),
      TEST_PR_LIST_FAILS: String(prListFails),
      TEST_PR_TITLE: PR_TITLE,
      TEST_PR_URL: PR_URL,
      TEST_STATUS_OUTPUT: statusOutput,
    },
  });

  return {
    cleanup: () => fs.rmSync(root, { force: true, recursive: true }),
    output: `${result.stdout}${result.stderr}`,
    status: result.status,
    prListArgs: fs.existsSync(Path.resolve(root, 'pr-list-args'))
      ? fs.readFileSync(Path.resolve(root, 'pr-list-args'), 'utf8')
      : undefined,
    prCreateArgs: fs.existsSync(Path.resolve(root, 'pr-create-args'))
      ? fs.readFileSync(Path.resolve(root, 'pr-create-args'), 'utf8')
      : undefined,
    autoMergeCalled: fs.existsSync(Path.resolve(root, 'merge-called')),
    uploadedPipeline: readIfExists(Path.resolve(root, 'uploaded-pipeline.yml')),
  };
};

describe('WHEN Console definitions are synchronized', () => {
  it('SHOULD open a PR with override-conflict instructions in the body and without auto-merge', () => {
    const result = runSync();
    try {
      expect(result.status).toBe(0);
      expect(result.prCreateArgs).toContain('If override conflict CI fails');
      expect(result.prCreateArgs).toContain('--updateOverrideAudit');
      expect(result.prCreateArgs).toContain('override_conflict_baseline.json');
      expect(result.autoMergeCalled).toBe(false);
      expect(result.prCreateArgs).toContain('--label backport:skip');
    } finally {
      result.cleanup();
    }
  });

  it('SHOULD open a PR when generation only adds new scoped files', () => {
    const result = runSync({
      statusOutput:
        '?? src/platform/plugins/shared/console/server/lib/spec_definitions/json/generated/new_endpoint.json',
    });
    try {
      expect(result.status).toBe(0);
      expect(result.prCreateArgs).toContain('[Console] Update console definitions (main)');
      expect(result.autoMergeCalled).toBe(false);
    } finally {
      result.cleanup();
    }
  });

  it('SHOULD remind the team instead of opening a duplicate PR', () => {
    const result = runSync({ existingPr: true });
    try {
      expect(result.status).toBe(0);
      expect(result.prCreateArgs).toBeUndefined();
      expect(result.autoMergeCalled).toBe(false);
      expect(result.uploadedPipeline).toContain('key: "console_defs_existing_pr"');
      expect(result.uploadedPipeline).toContain('- "#kibana-management"');
      expect(result.uploadedPipeline).toContain(`<${PR_URL}|${PR_TITLE}> hasn't been merged yet`);
      expect(result.uploadedPipeline).toContain('if: step.outcome == "passed"');
      expect(result.prListArgs).toContain(
        `"${PR_TITLE}" in:title author:kibanamachine author:app/elastic-vault-github-plugin-prod`
      );
      expect(result.prListArgs).not.toContain('--author');
    } finally {
      result.cleanup();
    }
  });

  it('SHOULD fail without opening a PR when the existing-PR lookup fails', () => {
    const result = runSync({ prListFails: true });
    try {
      expect(result.status).not.toBe(0);
      expect(result.prCreateArgs).toBeUndefined();
      expect(result.uploadedPipeline).toBeUndefined();
    } finally {
      result.cleanup();
    }
  });

  it('SHOULD preserve API doc-links PR labels and auto-merge behavior', () => {
    const result = runSync({ script: DOC_LINKS_SYNC_SCRIPT });
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

describe('WHEN the Console definitions sync reminder runs', () => {
  it('SHOULD ask for a review of the open PR in review mode', () => {
    const result = runSync({ script: REMINDER_SCRIPT, reminderMode: 'review', existingPr: true });
    try {
      expect(result.status).toBe(0);
      expect(result.uploadedPipeline).toContain('key: "console_defs_review_reminder"');
      expect(result.uploadedPipeline).toContain(`<${PR_URL}|${PR_TITLE}> is still open`);
    } finally {
      result.cleanup();
    }
  });

  it('SHOULD ask to merge or close the open PR in review_or_close mode', () => {
    const result = runSync({
      script: REMINDER_SCRIPT,
      reminderMode: 'review_or_close',
      existingPr: true,
    });
    try {
      expect(result.status).toBe(0);
      expect(result.uploadedPipeline).toContain('key: "console_defs_review_or_close_reminder"');
      expect(result.uploadedPipeline).toContain('Please merge or close it');
    } finally {
      result.cleanup();
    }
  });

  it('SHOULD ignore PRs whose title only partly matches', () => {
    const result = runSync({ script: REMINDER_SCRIPT, reminderMode: 'review_or_close' });
    try {
      expect(result.status).toBe(0);
      expect(result.uploadedPipeline).toBeUndefined();
    } finally {
      result.cleanup();
    }
  });

  it('SHOULD fail when the PR lookup fails', () => {
    const result = runSync({ script: REMINDER_SCRIPT, reminderMode: 'review', prListFails: true });
    try {
      expect(result.status).not.toBe(0);
      expect(result.uploadedPipeline).toBeUndefined();
    } finally {
      result.cleanup();
    }
  });

  it('SHOULD fail on an unknown mode', () => {
    const result = runSync({ script: REMINDER_SCRIPT, reminderMode: 'remind', existingPr: true });
    try {
      expect(result.status).toBe(1);
      expect(result.uploadedPipeline).toBeUndefined();
    } finally {
      result.cleanup();
    }
  });
});
