/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fsp from 'fs/promises';

import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';
import { Package } from '@kbn/repo-packages';

import { BuildPackages } from '../../../../../dev/build/tasks/build_packages_task';
import { Config } from '../../../../../dev/build/lib/config';
import { Build } from '../../../../../dev/build/lib/build';

const TEST_PACKAGE_PATH = 'src/core/packages/http/server-internal';
const TEST_PACKAGE_MANIFEST = Path.join(REPO_ROOT, TEST_PACKAGE_PATH, 'kibana.jsonc');

// We allow extra time due to building packages. Runtime is about 2min.
jest.setTimeout(300 * 1000);

describe('barrel transform build integration', () => {
  let outputDir: string;
  let testPackage: Package;
  let log: ToolingLog;

  beforeAll(async () => {
    testPackage = Package.fromManifest(REPO_ROOT, TEST_PACKAGE_MANIFEST);
    outputDir = Path.join(REPO_ROOT, 'build', 'kibana', testPackage.normalizedRepoRelativeDir);
    log = new ToolingLog({ level: 'info', writeTo: process.stdout });

    // Cleanup package build if it already exists
    await Fsp.rm(outputDir, { recursive: true, force: true });
  });

  it('builds package with barrel transforms applied', async () => {
    const realConfig = await Config.create({
      isRelease: false,
      targetAllPlatforms: false,
      targetServerlessPlatforms: false,
      dockerContextUseLocalArtifact: null,
      dockerCrossCompile: false,
      dockerNamespace: null,
      dockerPush: false,
      dockerTag: null,
      dockerTagQualifier: null,
      downloadFreshNode: false,
      withExamplePlugins: false,
      withTestPlugins: false,
    });

    const mockConfig = Object.create(realConfig);
    mockConfig.getDistPackagesFromRepo = () => [testPackage];

    const build = new Build(mockConfig);
    await BuildPackages.run(mockConfig, log, build);

    const outputSrcDir = Path.join(outputDir, 'src');

    const testFilePath = Path.join(outputSrcDir, 'http_server.js');
    const testFileContent = await Fsp.readFile(testFilePath, 'utf-8');

    // Original: import { getEcsResponseLog } from './logging';
    expect(testFileContent).not.toMatch(/require\(['"]\.\/logging['"]\)/);
    expect(testFileContent).toMatch(/require\(['"]\.\/logging\/get_response_log['"]\)/);

    // Original: import { firstValueFrom, pairwise, take } from 'rxjs';
    // With package exports field, the import is transformed to use the public subpath
    expect(testFileContent).not.toMatch(/require\(['"]rxjs['"]\)/);
    expect(testFileContent).toMatch(/require\(['"]rxjs\/internal\/firstValueFrom['"]\)/);

    // Original: import { modifyUrl } from '@kbn/std';
    // @kbn/std has no exports field - tests symlinked package barrel transform
    const basePathTestFilePath = Path.join(outputSrcDir, 'base_path_service.js');
    const basePathTestFileContent = await Fsp.readFile(basePathTestFilePath, 'utf-8');
    expect(basePathTestFileContent).not.toMatch(/require\(['"]@kbn\/std['"]\)/);
    expect(basePathTestFileContent).toMatch(/require\(['"]@kbn\/std\/src\/url['"]\)/);
  });
});
