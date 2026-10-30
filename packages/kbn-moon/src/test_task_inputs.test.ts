/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { REPO_ROOT } from '@kbn/repo-info';
import { getAffectedMoonJestTargets } from './query_projects';

const moon = path.join(REPO_ROOT, 'node_modules/.bin/moon');

describe('Moon Jest task inputs', () => {
  let fixtureRoot: string;
  const originalMoonWorkspaceRoot = process.env.MOON_WORKSPACE_ROOT;

  const write = (relativePath: string, contents: string): void => {
    const filePath = path.join(fixtureRoot, relativePath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, contents);
  };

  const affectedProjects = (tag: string, changedFile: string, downstream = 'none'): string[] => {
    const args = ['query', 'tasks', '--tags', `^${tag}$`, '--affected'];
    if (downstream !== 'none') args.push('--downstream', downstream);
    const result = execFileSync(moon, args, {
      cwd: fixtureRoot,
      encoding: 'utf8',
      input: JSON.stringify({ files: [changedFile] }),
      env: { ...process.env, CI: 'true' },
    });
    return Object.keys((JSON.parse(result) as { tasks: Record<string, object> }).tasks).sort();
  };

  beforeAll(() => {
    fixtureRoot = mkdtempSync(path.join(tmpdir(), 'kbn-moon-jest-inputs-'));
    process.env.MOON_WORKSPACE_ROOT = fixtureRoot;
    write(
      '.moon/workspace.yml',
      `projects:
  sources:
    leaf: leaf
    middle: middle
    app: app
    jest-tooling: jest-tooling
    '@kbn/scout': scout
vcs:
  client: git
  defaultBranch: main
pipeline:
  installDependencies: false
  syncWorkspace: false
  syncProjectDependencies: false
  syncProjects: false
`
    );
    write('.moon/toolchains.yml', 'node: {}\n');
    mkdirSync(path.join(fixtureRoot, '.moon/tasks'));
    for (const task of [
      'node.yml',
      'jest-unit-tests.yml',
      'jest-integration-tests.yml',
      'scout-tests.yml',
    ]) {
      copyFileSync(
        path.join(REPO_ROOT, '.moon/tasks', task),
        path.join(fixtureRoot, '.moon/tasks', task)
      );
    }
    for (const [id, dependency] of [
      ['leaf', null],
      ['middle', 'leaf'],
      ['app', 'middle'],
    ] as const) {
      write(
        `${id}/moon.yml`,
        `id: ${id}
language: typescript
toolchains:
  default: node
dependsOn: ${dependency ? `[${dependency}]` : '[]'}
tags: [jest-unit-tests, jest-integration-tests, scout-tests]
`
      );
      write(`${id}/jest.config.js`, 'module.exports = {};\n');
      write(`${id}/jest.integration.config.js`, 'module.exports = {};\n');
      write(`${id}/test/scout/ui/playwright.config.ts`, 'export default {};\n');
      write(`${id}/index.ts`, `export const ${id} = 1;\n`);
      write(`${id}/index.test.ts`, `it('${id}', () => {});\n`);
    }
    write('leaf/__fixtures__/data.json', '{}\n');
    write('leaf/test/scout/ui/fixtures/shared.ts', 'export const helper = 1;\n');
    write('leaf/test/scout/ui/tests/local.spec.ts', "test('local', () => {});\n");
    write(
      'scout/moon.yml',
      `id: '@kbn/scout'
language: typescript
toolchains:
  default: node
`
    );
    write('scout/index.ts', 'export const scout = 1;\n');
    write(
      'jest-tooling/moon.yml',
      `id: jest-tooling
language: javascript
toolchains:
  default: node
workspace:
  inheritedTasks:
    include: []
tasks:
  hash:
    command: 'true'
    inputs: ['**/*']
`
    );
    write('jest-tooling/runner.js', 'module.exports = {};\n');
    write(
      'scripts/moon_jest.js',
      `const fs = require('fs');
fs.appendFileSync(process.env.MOON_FIXTURE_OUTPUT, process.env.MOON_PROJECT_SOURCE + '\\n');
if (process.env.MOON_FIXTURE_ARGS_OUTPUT) fs.appendFileSync(process.env.MOON_FIXTURE_ARGS_OUTPUT, JSON.stringify(process.argv.slice(2)) + '\\n');
`
    );
    execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: fixtureRoot });
    execFileSync('git', ['add', '.'], { cwd: fixtureRoot });
    execFileSync(
      'git',
      [
        '-c',
        'user.name=Moon Fixture',
        '-c',
        'user.email=moon@example.com',
        'commit',
        '-qm',
        'fixture',
      ],
      { cwd: fixtureRoot }
    );
  });

  afterAll(() => {
    if (originalMoonWorkspaceRoot === undefined) {
      delete process.env.MOON_WORKSPACE_ROOT;
    } else {
      process.env.MOON_WORKSPACE_ROOT = originalMoonWorkspaceRoot;
    }
    if (fixtureRoot) rmSync(fixtureRoot, { recursive: true, force: true });
  });

  it('selects downstream tests when a shared fixture changes', () => {
    expect(affectedProjects('jest-unit-tests', 'leaf/__fixtures__/data.json')).toEqual(['leaf']);
    expect(affectedProjects('jest-unit-tests', 'leaf/__fixtures__/data.json', 'deep')).toEqual([
      'app',
      'leaf',
      'middle',
    ]);
    expect(affectedProjects('jest-integration-tests', 'leaf/__fixtures__/data.json')).toEqual([
      'leaf',
    ]);
    expect(
      affectedProjects('jest-integration-tests', 'leaf/__fixtures__/data.json', 'deep')
    ).toEqual(['app', 'leaf', 'middle']);
  });

  it('keeps a test-only change in its owning project', () => {
    expect(affectedProjects('jest-unit-tests', 'leaf/index.test.ts')).toEqual(['leaf']);
    expect(affectedProjects('jest-unit-tests', 'leaf/index.test.ts', 'deep')).toEqual(['leaf']);
  });

  it('selects transitive consumers for a source change', () => {
    expect(affectedProjects('jest-unit-tests', 'leaf/index.ts', 'deep')).toEqual([
      'app',
      'leaf',
      'middle',
    ]);
  });

  it('selects downstream Scout projects for shared fixtures but not local specs', () => {
    expect(
      affectedProjects('scout-tests', 'leaf/test/scout/ui/fixtures/shared.ts', 'deep')
    ).toEqual(['app', 'leaf', 'middle']);
    expect(
      affectedProjects('scout-tests', 'leaf/test/scout/ui/tests/local.spec.ts', 'deep')
    ).toEqual(['leaf']);
  });

  it('runs transitive consumers when downstream expansion is requested', async () => {
    const outputFile = path.join(fixtureRoot, 'selected.txt');
    const argsFile = path.join(fixtureRoot, 'args.txt');
    writeFileSync(outputFile, '');
    writeFileSync(argsFile, '');
    const targets = await getAffectedMoonJestTargets({
      changedFilesJson: JSON.stringify({ files: ['leaf/index.ts'] }),
      downstream: 'deep',
      workspaceRoot: fixtureRoot,
    });
    const before = execFileSync(
      moon,
      [
        'run',
        ...targets,
        '--concurrency',
        '1',
        '--summary',
        'detailed',
        '--',
        '-u',
        'example.test.ts',
      ],
      {
        cwd: fixtureRoot,
        encoding: 'utf8',
        env: {
          ...process.env,
          MOON_FIXTURE_OUTPUT: outputFile,
          MOON_FIXTURE_ARGS_OUTPUT: argsFile,
        },
      }
    );
    expect(readFileSync(outputFile, 'utf8').trim().split('\n').sort()).toEqual([
      'app',
      'leaf',
      'middle',
    ]);
    const forwarded = readFileSync(argsFile, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as string[]);
    expect(forwarded).toHaveLength(3);
    forwarded.forEach((args) => {
      expect(args.slice(args.indexOf('--') + 1)).toEqual(['-u', 'example.test.ts']);
    });

    write('leaf/index.ts', 'export const leaf = 2;\n');
    const after = execFileSync(moon, ['run', 'app:jest', '--summary', 'detailed'], {
      cwd: fixtureRoot,
      encoding: 'utf8',
      env: { ...process.env, MOON_FIXTURE_OUTPUT: outputFile },
    });
    const appHash = (output: string) =>
      output
        .replace(/\x1B\[[0-9;]*[A-Za-z]/g, '')
        .match(/RunTask\(app:jest\) \([^)]*, ([^,\s)]+)\)/)?.[1];
    expect(appHash(before)).toBeDefined();
    expect(appHash(after)).toBeDefined();
    expect(appHash(after)).not.toBe(appHash(before));
  });
});
