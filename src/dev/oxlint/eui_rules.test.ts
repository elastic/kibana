/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { REPO_ROOT } from '@kbn/repo-info';

import { oxlintBinPath } from './constants';

const recommendedRulesDisabledInConfig = (): string[] => {
  const stdout = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      `
        import config from './oxlint.config.mjs';
        import { createRequire } from 'node:module';
        const { configs } = createRequire(import.meta.url)('@elastic/eslint-plugin-eui');
        const rank = (value) => {
          const level = Array.isArray(value) ? value[0] : value;
          if (level === 'error' || level === 'deny') return 2;
          if (level === 'warn') return 1;
          return 0;
        };
        const missing = Object.entries(configs.recommended.rules)
          .filter(([name, recommended]) => rank(config.rules[name]) < rank(recommended))
          .map(([name]) => name);
        process.stdout.write(JSON.stringify(missing));
      `,
    ],
    { cwd: REPO_ROOT, encoding: 'utf8' }
  );

  return JSON.parse(stdout) as string[];
};

describe('EUI oxlint rules', () => {
  it('keeps every recommended preset rule enabled', () => {
    expect(recommendedRulesDisabledInConfig()).toEqual([]);
  });

  it('runs a preset rule and a Kibana override through oxlint', () => {
    const dir = mkdtempSync(join(tmpdir(), 'eui-oxlint-'));
    const file = join(dir, 'fixture.tsx');
    writeFileSync(
      file,
      `import { EuiIcon } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';

export const icon = <EuiIcon type="arrowDown" />;
export const theme = euiThemeVars;
`
    );

    let stdout = '';
    try {
      stdout = execFileSync(
        process.execPath,
        [oxlintBinPath, '--config', join(REPO_ROOT, 'oxlint.config.mjs'), '--format', 'json', file],
        { cwd: REPO_ROOT, encoding: 'utf8' }
      );
    } catch (error) {
      stdout = (error as { stdout?: string }).stdout ?? '';
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }

    const report = JSON.parse(stdout.slice(stdout.indexOf('{'))) as {
      diagnostics: Array<{ code: string; message: string; severity: string }>;
    };

    expect(report.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: '@elastic/eui(no-removed-icons)',
          severity: 'error',
          message:
            'Icon `arrowDown` was removed from EUI and renders as a broken image. Use `chevronSingleDown` instead.',
        }),
        expect.objectContaining({
          code: '@elastic/eui(no-restricted-eui-imports)',
          severity: 'warning',
          message: 'For client-side, please use `useEuiTheme` instead.',
        }),
      ])
    );
  });
});
