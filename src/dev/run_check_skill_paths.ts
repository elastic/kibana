/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { writeFileSync } from 'fs';

import globby from 'globby';

import { REPO_ROOT } from '@kbn/repo-info';
import { run } from '@kbn/dev-cli-runner';

import { runSkillPathCheck } from './skill_paths/run_skill_path_check';

run(
  async ({ log, flagsReader }) => {
    const quiet = flagsReader.boolean('quiet');
    const writeJson = flagsReader.boolean('json');
    const outPath = flagsReader.string('out') ?? 'skill_path_report.json';

    const paths = await globby('x-pack/solutions/security/**/.agents/skills/**/*.md', {
      cwd: REPO_ROOT,
      onlyFiles: true,
      gitignore: true,
    });

    const absolutePaths = paths.map((p) => `${REPO_ROOT}/${p}`);

    const result = await runSkillPathCheck(absolutePaths, REPO_ROOT);

    log.info(
      `Checked ${result.checked} paths, found ${result.findings.length} stale, skipped ${result.skipped}`
    );

    if (!quiet) {
      for (const finding of result.findings) {
        log.info(`STALE: ${finding.file}:${finding.line} — ${finding.token}`);
      }
    }

    if (writeJson) {
      writeFileSync(outPath, JSON.stringify(result, null, 2));
      log.info(`JSON report written to ${outPath}`);
    }
  },
  {
    flags: {
      boolean: ['quiet', 'json'],
      string: ['out'],
      default: {
        out: 'skill_path_report.json',
      },
      help: `
        --quiet   Suppress per-finding log lines (summary is always printed).
        --json    Write findings as JSON to the path given by --out.
        --out     Output file path for --json (default: skill_path_report.json).
      `,
    },
  }
);
