/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ImportResolver } from '@kbn/import-resolver';
import { ModuleId } from './module_id';
import { ModuleType } from './module_type';
import { RANDOM_TEST_FILE_NAMES, TEST_DIR, TEST_TAG } from './config';
import { RepoPath } from './repo_path';

export class RepoSourceClassifier {
  constructor(private readonly resolver: ImportResolver) {}

  private repoPaths = new Map<string, RepoPath>();
  private ids = new Map<RepoPath, ModuleId>();

  /**
   * Get the cached repo path instance
   */
  private getRepoPath(path: string) {
    const cached = this.repoPaths.get(path);

    if (cached !== undefined) {
      return cached;
    }

    const rp = new RepoPath(path, this.resolver);
    this.repoPaths.set(path, rp);
    return rp;
  }

  /**
   * Is this a "test" file?
   */
  private isTestFile(path: RepoPath) {
    const name = path.getFilename();

    if (name.startsWith('mock_') || RANDOM_TEST_FILE_NAMES.has(name)) {
      return true;
    }

    if (name.startsWith('_')) {
      for (const tag of TEST_TAG) {
        if (name.includes(tag)) {
          return true;
        }
      }
    }

    const tag = name.split('.').at(-1);
    if (tag && TEST_TAG.has(tag)) {
      return true;
    }

    for (const seg of path.getSegs()) {
      if (TEST_DIR.has(seg)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Is this a tooling file?
   */
  private isToolingFile(path: RepoPath) {
    const segs = path.getSegs();
    if (
      segs.includes('scripts') &&
      !path.getRepoRel().startsWith('src/plugins/data/server/scripts/')
    ) {
      return true;
    }

    if (path.getFilename() === 'webpack.config' && path.getPkgInfo()?.pkgId !== '@kbn/optimizer') {
      return true;
    }

    return false;
  }

  /**
   * Apply canvas specific rules
   * @param root the root dir within the canvas plugin
   * @param dirs the directories after the root dir
   * @returns a type, or undefined if the file should be classified as a standard file
   */
  private classifyCanvas(root: string, dirs: string[]): ModuleType | undefined {
    if (root === 'canvas_plugin_src') {
      if (dirs[0] === 'expression_types') {
        return 'common package';
      }

      const subRoot = dirs.slice(0, 2).join('/');
      if (subRoot === 'functions/external') {
        return 'common package';
      }
      if (subRoot === 'functions/server') {
        return 'server package';
      }

      return 'browser package';
    }

    if (root === 'i18n') {
      return 'common package';
    }

    if (root === 'shareable_runtime') {
      return 'non-package';
    }

    if (root === 'tasks') {
      return 'tests or mocks';
    }
  }

  /**
   * Determine the "type" of a file
   */
  private getType(path: RepoPath): ModuleType {
    if (path.getExtname() === '.json') {
      return 'static';
    }

    if (this.isTestFile(path)) {
      return 'tests or mocks';
    }

    if (this.isToolingFile(path)) {
      return 'tooling';
    }

    const pkgInfo = path.getPkgInfo();
    if (!pkgInfo) {
      return 'non-package';
    }

    const { pkgId, rel } = pkgInfo;
    const pkgIdWords = new Set(pkgId.split(/\W+/));
    // treat any package with "mocks" or "storybook" in the ID as a test-specific package
    if (pkgIdWords.has('mocks') || pkgIdWords.has('storybook') || pkgIdWords.has('test')) {
      return 'tests or mocks';
    }

    if (path.resolver.isBazelPackage(pkgId)) {
      return 'common package';
    }

    const [root, ...dirs] = rel.split('/');

    if (pkgId === '@kbn/core' && root === 'types') {
      return 'common package';
    }

    if (pkgId === '@kbn/canvas-plugin') {
      const type = this.classifyCanvas(root, dirs);
      if (type) {
        return type;
      }
    }

    if (root === 'public' || root === 'static') {
      return 'browser package';
    }

    if (root === 'server') {
      return 'server package';
    }

    return 'common package';
  }

  classify(absolute: string) {
    const path = this.getRepoPath(absolute);
    const cached = this.ids.get(path);

    if (cached) {
      return cached;
    }

    const id: ModuleId = {
      type: this.getType(path),
      repoRel: path.getRepoRel(),
      pkgInfo: path.getPkgInfo() ?? undefined,
    };
    this.ids.set(path, id);
    return id;
  }
}
