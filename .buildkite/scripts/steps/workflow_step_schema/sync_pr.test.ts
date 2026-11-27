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

const SYNC_SCRIPT = Path.resolve(__dirname, 'sync_pr.sh');
const GENERATED_FILE =
  'src/platform/packages/private/kbn-workflow-step-schema-cli/generated/index.json';
const SYNC_PR_TITLE = '[One Workflow] Update workflow step schema';
const EXISTING_BRANCH = 'workflow_step_schema_existing';

const writeFile = (file: string, content: string, mode?: number) => {
  fs.mkdirSync(Path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  if (mode) fs.chmodSync(file, mode);
};

const runSync = ({
  committedSchema,
  generatedSchema,
  existingPrSchema,
}: {
  /** What the target branch has committed. */
  committedSchema: string;
  /** What the (stubbed) generation produces. */
  generatedSchema: string;
  /** When set, an open sync PR exists whose branch carries this schema. */
  existingPrSchema?: string;
}) => {
  const root = fs.mkdtempSync(Path.join(os.tmpdir(), 'workflow-step-schema-sync-'));
  const origin = Path.join(root, 'origin.git');
  const work = Path.join(root, 'work');
  const fakeBin = Path.join(root, 'bin');
  // The script runs `git config --global`: keep it away from the developer's real config.
  const gitEnv = {
    ...process.env,
    HOME: root,
    GIT_CONFIG_GLOBAL: Path.join(root, 'gitconfig'),
    GIT_CONFIG_NOSYSTEM: '1',
  };

  const git = (cwd: string, ...args: string[]) => {
    const result = spawnSync(
      'git',
      ['-c', 'user.name=test', '-c', 'user.email=test@example.com', ...args],
      { cwd, encoding: 'utf8', env: gitEnv }
    );
    if (result.status !== 0) {
      throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
    }
    return result.stdout.trim();
  };

  fs.mkdirSync(origin, { recursive: true });
  git(origin, 'init', '--bare', '-b', 'main');
  fs.mkdirSync(work, { recursive: true });
  git(work, 'init', '-b', 'main');
  git(work, 'remote', 'add', 'origin', origin);

  // Stand-ins for the collaborators the script sources or calls out to.
  writeFile(Path.join(work, '.buildkite/scripts/common/util.sh'), 'retry() { shift 2; "$@"; }\n');
  writeFile(Path.join(work, '.buildkite/scripts/bootstrap.sh'), '#!/usr/bin/env bash\n', 0o755);
  writeFile(
    Path.join(work, '.buildkite/scripts/setup_es_snapshot_cache.sh'),
    '#!/usr/bin/env bash\n',
    0o755
  );
  writeFile(Path.join(work, GENERATED_FILE), `${committedSchema}\n`);
  git(work, 'add', '-A');
  git(work, 'commit', '-m', 'initial');
  git(work, 'push', 'origin', 'main');

  if (existingPrSchema !== undefined) {
    git(work, 'checkout', '-b', EXISTING_BRANCH);
    writeFile(Path.join(work, GENERATED_FILE), `${existingPrSchema}\n`);
    git(work, 'commit', '-am', 'existing sync PR');
    git(work, 'push', 'origin', EXISTING_BRANCH);
    git(work, 'checkout', 'main');
  }

  writeFile(
    Path.join(fakeBin, 'node'),
    `#!/usr/bin/env bash
printf '%s\\n' "\${TEST_GENERATED}" > "${GENERATED_FILE}"
`,
    0o755
  );
  writeFile(
    Path.join(fakeBin, 'gh'),
    `#!/usr/bin/env bash
case "\${1:-} \${2:-}" in
  "pr list") printf '%s\\n' "\${TEST_PR_LIST_JSON}" ;;
  "pr create") touch "\${TEST_ROOT}/pr-created"; echo "https://github.com/elastic/kibana/pull/99" ;;
  "pr merge") touch "\${TEST_ROOT}/auto-merge" ;;
esac
exit 0
`,
    0o755
  );
  writeFile(
    Path.join(fakeBin, 'buildkite-agent'),
    `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "\${TEST_ROOT}/buildkite-agent-args"
`,
    0o755
  );

  const remoteHeads = () => git(origin, 'for-each-ref', '--format=%(refname:short) %(objectname)');
  const headsBefore = remoteHeads();

  const result = spawnSync('bash', [SYNC_SCRIPT], {
    cwd: work,
    encoding: 'utf8',
    env: {
      ...gitEnv,
      PATH: `${fakeBin}:${process.env.PATH}`,
      BUILDKITE_BRANCH: 'main',
      BUILDKITE_BUILD_URL: 'https://buildkite.com/elastic/test/builds/1',
      TEST_ROOT: root,
      TEST_GENERATED: generatedSchema,
      TEST_PR_LIST_JSON: JSON.stringify(
        existingPrSchema === undefined
          ? []
          : [{ number: 42, headRefName: EXISTING_BRANCH, title: SYNC_PR_TITLE }]
      ),
    },
  });

  const exists = (name: string) => fs.existsSync(Path.join(root, name));

  return {
    cleanup: () => fs.rmSync(root, { force: true, recursive: true }),
    output: `${result.stdout}${result.stderr}`,
    status: result.status,
    headsBefore,
    headsAfter: remoteHeads(),
    schemaOnRemote: (branch: string) => git(origin, 'show', `${branch}:${GENERATED_FILE}`),
    newRemoteBranches: () =>
      git(origin, 'for-each-ref', '--format=%(refname:short)', 'refs/heads/workflow_step_schema_*')
        .split('\n')
        .filter((branch) => branch && branch !== EXISTING_BRANCH),
    prCreated: exists('pr-created'),
    autoMergeEnabled: exists('auto-merge'),
  };
};

describe('WHEN the workflow step schema sync runs', () => {
  describe('AND the generated schema matches the committed one', () => {
    it('SHOULD do nothing', () => {
      const result = runSync({ committedSchema: 'v1', generatedSchema: 'v1' });
      try {
        expect(result.status).toBe(0);
        expect(result.output).toContain('up to date');
        expect(result.headsAfter).toBe(result.headsBefore);
        expect(result.prCreated).toBe(false);
      } finally {
        result.cleanup();
      }
    });
  });

  describe('AND the schema drifted with no open sync PR', () => {
    it('SHOULD push a new branch, open a PR and enable auto-merge', () => {
      const result = runSync({ committedSchema: 'v1', generatedSchema: 'v2' });
      try {
        expect(result.status).toBe(0);
        const [branch] = result.newRemoteBranches();
        expect(result.newRemoteBranches()).toHaveLength(1);
        expect(result.schemaOnRemote(branch)).toBe('v2');
        expect(result.prCreated).toBe(true);
        expect(result.autoMergeEnabled).toBe(true);
      } finally {
        result.cleanup();
      }
    });
  });

  describe('AND the schema drifted while an open sync PR already carries it', () => {
    it('SHOULD NOT push, so the PR keeps its CI run and merge queue position', () => {
      const result = runSync({
        committedSchema: 'v1',
        generatedSchema: 'v2',
        existingPrSchema: 'v2',
      });
      try {
        expect(result.status).toBe(0);
        expect(result.output).toContain('already carries this schema');
        expect(result.headsAfter).toBe(result.headsBefore);
        expect(result.prCreated).toBe(false);
        expect(result.autoMergeEnabled).toBe(false);
      } finally {
        result.cleanup();
      }
    });
  });

  describe('AND the schema drifted again since the open sync PR was last updated', () => {
    it('SHOULD force-update the existing PR branch and re-enable auto-merge', () => {
      const result = runSync({
        committedSchema: 'v1',
        generatedSchema: 'v3',
        existingPrSchema: 'v2',
      });
      try {
        expect(result.status).toBe(0);
        expect(result.headsAfter).not.toBe(result.headsBefore);
        expect(result.schemaOnRemote(EXISTING_BRANCH)).toBe('v3');
        expect(result.newRemoteBranches()).toHaveLength(0);
        expect(result.prCreated).toBe(false);
        expect(result.autoMergeEnabled).toBe(true);
      } finally {
        result.cleanup();
      }
    });
  });
});
