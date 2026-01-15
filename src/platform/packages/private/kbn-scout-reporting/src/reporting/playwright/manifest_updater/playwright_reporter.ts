/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FullConfig, Reporter, Suite } from '@playwright/test/reporter';
import { ToolingLog } from '@kbn/tooling-log';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '@kbn/repo-info';
import { computeTestID } from '../../../helpers/test_id_generator';
import { getGitSHA1ForPath } from '../../../registry/manifest';
import type { ScoutTestConfig } from '../../../registry';
import { testConfig } from '../../../registry';

/**
 * Scout Playwright reporter
 */
export class ScoutManifestUpdater implements Reporter {
  readonly log: ToolingLog;
  scoutConfig!: ScoutTestConfig;

  constructor() {
    this.log = new ToolingLog({
      level: 'info',
      writeTo: process.stdout,
    });
  }

  onBegin(config: FullConfig, suite: Suite) {
    this.scoutConfig = testConfig.fromPath(config.configFile!);

    this.scoutConfig.manifest.tests = suite.allTests().map((test) => {
      // Title path
      //  [0] Root suite
      //  [1] Project
      //  [2] Test file
      //  [3] Suite file
      //  [4] Individual test title
      const title = test.titlePath().slice(3).join(' ');
      const testFilePath = path.relative(REPO_ROOT, test.location.file);

      return {
        id: computeTestID(testFilePath, title),
        title,
        expectedStatus: test.expectedStatus,
        tags: test.tags,
        location: {
          file: testFilePath,
          line: test.location.line,
          column: test.location.column,
        },
      };
    });
  }

  async onExit() {
    mkdirSync(path.dirname(this.scoutConfig.manifest.path), { recursive: true });

    writeFileSync(
      this.scoutConfig.manifest.path,
      JSON.stringify(
        {
          lastModified: new Date().toISOString(),
          sha1: await getGitSHA1ForPath(path.dirname(this.scoutConfig.path)),
          tests: this.scoutConfig.manifest.tests,
        },
        null,
        2
      )
    );
  }
}
