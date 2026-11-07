/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import { chromium } from '@playwright/test';
import { REPO_ROOT } from '@kbn/repo-info';
import { formatBytes } from '@kbn/es';
import type { CheckResult, DoctorCheck } from '../types';
import { fail, pass, warn } from '../types';
import { braces, getSize, removePaths, tildify } from '../utils';

const CHROMIUM_DIR_REGEX = /^(chromium|chromium_headless_shell)-(\d+)$/;

interface BrowsersInfo {
  cacheDir: string;
  revision: string;
  browserVersion: string;
  playwrightVersion: string;
}

const getBrowsersInfo = async (): Promise<BrowsersInfo> => {
  const playwrightCoreDir = Path.resolve(REPO_ROOT, 'node_modules/playwright-core');
  const [{ browsers }, { version }] = await Promise.all(
    ['browsers.json', 'package.json'].map(async (file) =>
      JSON.parse(await Fs.promises.readFile(Path.join(playwrightCoreDir, file), 'utf8'))
    )
  );
  const { revision, browserVersion } = browsers.find(
    ({ name }: { name: string }) => name === 'chromium'
  );
  // e.g. ~/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/...
  const [cacheDir] = chromium.executablePath().split(`${Path.sep}chromium-${revision}${Path.sep}`);

  return { cacheDir, revision, browserVersion, playwrightVersion: version };
};

const isInstalled = (dir: string) => Fs.existsSync(Path.join(dir, 'INSTALLATION_COMPLETE'));

export const playwrightChecks: DoctorCheck[] = [
  {
    title: 'Chromium',
    run: async (): Promise<CheckResult> => {
      const { cacheDir, revision, browserVersion, playwrightVersion } = await getBrowsersInfo();
      const missing = ['chromium', 'chromium_headless_shell'].filter(
        (name) => !isInstalled(Path.join(cacheDir, `${name}-${revision}`))
      );

      return missing.length
        ? fail(
            `${missing.join(
              ' and '
            )} ${revision} for Playwright ${playwrightVersion} is not installed`,
            { fix: { command: 'npx playwright install chromium' } }
          )
        : pass(`Chromium ${browserVersion} (${revision}) for Playwright ${playwrightVersion}`);
    },
  },
  {
    title: 'Old Chromium revisions',
    run: async () => {
      const { cacheDir, revision } = await getBrowsersInfo();
      const oldDirs = (await Fs.promises.readdir(cacheDir)).flatMap((dir) => {
        const oldRevision = dir.match(CHROMIUM_DIR_REGEX)?.[2];
        return oldRevision && oldRevision !== revision ? [{ dir, revision: oldRevision }] : [];
      });
      if (!oldDirs.length) {
        return pass('No old Chromium revisions in cache');
      }

      const size = (
        await Promise.all(oldDirs.map(({ dir }) => getSize(Path.join(cacheDir, dir))))
      ).reduce((total, dirSize) => total + dirSize, 0);
      const revisions = [...new Set(oldDirs.map((oldDir) => oldDir.revision))];

      return warn(`Old Chromium revisions ${revisions.join(', ')} use ${formatBytes(size)}`, {
        hint: 'other branches may need them',
        fix: {
          command: `rm -rf ${tildify(cacheDir)}/${braces([
            ...new Set(oldDirs.map(({ dir }) => dir.replace(/-\d+$/, ''))),
          ])}-${braces(revisions)}`,
          destructive: true,
          run: () => removePaths(oldDirs.map(({ dir }) => Path.join(cacheDir, dir))),
        },
      });
    },
  },
];
