/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync, readFileSync } from 'fs';
import { basename, join } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { getPackages } from '@kbn/repo-packages';
import {
  excludeDirsByName,
  excludeDirsByRel,
  excludeFileByName,
  excludeFileByTags,
} from './build_packages_task';

/**
 * A task pod runs from the distributable, so the build must keep what a pod reads at runtime: the
 * `bin/kibana-task-pod` script, the CLI (`@kbn/cli`'s `task_pod`), each family manifest next to its
 * owning plugin and every plugin's `server/tasks` entry. `BuildPackages` copies a checked-in file of
 * a package unless it is excluded by name, tag or directory; these tests keep those excludes from
 * swallowing pod files.
 */
describe('task pod files in the distributable', () => {
  const packages = getPackages(REPO_ROOT);

  /** Whether `BuildPackages` copies the file at `rel` (relative to the package directory). */
  const isCopied = (rel: string) => {
    const parts = rel.split('/');
    const name = parts[parts.length - 1];
    const tags = name.split('.').slice(0, -1);
    const dirs = parts.slice(0, -1);
    return (
      !dirs.some(
        (_, i) => excludeDirsByName(dirs[i]) || excludeDirsByRel(dirs.slice(0, i + 1).join('/'))
      ) &&
      !excludeFileByName(name) &&
      !excludeFileByTags(tags)
    );
  };

  it('copies every family manifest', () => {
    const manifests = packages
      .map((pkg) => join(pkg.directory, 'task_pod.jsonc'))
      .filter((path) => existsSync(path));
    expect(manifests.length).toBeGreaterThanOrEqual(4);
    for (const manifest of manifests) {
      expect(isCopied(basename(manifest))).toBe(true);
    }
  });

  it('copies the tasks entry of every plugin that declares one', () => {
    const withTasks = packages.filter(
      (pkg) => pkg.isPlugin() && (pkg.manifest.plugin as { tasks?: unknown }).tasks
    );
    expect(withTasks.length).toBeGreaterThan(0);
    for (const pkg of withTasks) {
      const entry = join(pkg.directory, 'server', 'tasks', 'index.ts');
      expect(`${pkg.manifest.id}: ${existsSync(entry)}`).toBe(`${pkg.manifest.id}: true`);
      expect(isCopied('server/tasks/index.ts')).toBe(true);
    }
  });

  it('ships the pod launcher with the semi-space setting and the CLI it runs', () => {
    for (const script of ['kibana-task-pod', 'kibana-task-pod.bat']) {
      const path = join(__dirname, 'bin', 'scripts', script);
      expect(existsSync(path)).toBe(true);
      expect(readFileSync(path, 'utf8')).toContain('--max-semi-space-size=');
    }
    const cli = join(REPO_ROOT, 'src', 'cli');
    expect(existsSync(join(cli, 'task_pod', 'dist.js'))).toBe(true);
    expect(isCopied('task_pod/dist.js')).toBe(true);
    expect(isCopied('task_pod/budgets.yml')).toBe(true);
  });
});
