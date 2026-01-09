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

const CORE_SERVER_PKG_MANIFEST = Path.join(
  REPO_ROOT,
  'src/core/packages/http/server-internal/kibana.jsonc'
);
const CONFIG_PKG_MANIFEST = Path.join(
  REPO_ROOT,
  'src/platform/packages/shared/kbn-config/kibana.jsonc'
);
const UNIFIED_DATA_TABLE_PKG_MANIFEST = Path.join(
  REPO_ROOT,
  'src/platform/packages/shared/kbn-unified-data-table/kibana.jsonc'
);

const CORE_SERVER_PKG = Package.fromManifest(REPO_ROOT, CORE_SERVER_PKG_MANIFEST);
const CONFIG_PKG = Package.fromManifest(REPO_ROOT, CONFIG_PKG_MANIFEST);
const UNIFIED_DATA_TABLE_PKG = Package.fromManifest(REPO_ROOT, UNIFIED_DATA_TABLE_PKG_MANIFEST);

const BUILD_DIR = Path.join(REPO_ROOT, 'build', 'kibana');
const CORE_SERVER_OUTPUT = Path.join(BUILD_DIR, CORE_SERVER_PKG.normalizedRepoRelativeDir, 'src');
const CONFIG_OUTPUT = Path.join(BUILD_DIR, CONFIG_PKG.normalizedRepoRelativeDir, 'src');
const UNIFIED_DATA_TABLE_OUTPUT = Path.join(
  BUILD_DIR,
  UNIFIED_DATA_TABLE_PKG.normalizedRepoRelativeDir,
  'src'
);

const LOGGER = new ToolingLog({ level: 'info', writeTo: process.stdout });
const FILE_ENCODING = 'utf-8';

// We allow extra time due to building packages. Runtime is about 2min.
jest.setTimeout(300 * 1000);

describe('barrel transform build integration', () => {
  beforeAll(async () => {
    // Cleanup package build if it already exists
    await Fsp.rm(BUILD_DIR, { recursive: true, force: true });
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
    mockConfig.getDistPackagesFromRepo = () => [
      CORE_SERVER_PKG,
      CONFIG_PKG,
      UNIFIED_DATA_TABLE_PKG,
    ];

    const build = new Build(mockConfig);
    await BuildPackages.run(mockConfig, LOGGER, build);

    const httpServerFileContent = await Fsp.readFile(
      Path.join(CORE_SERVER_OUTPUT, 'http_server.js'),
      FILE_ENCODING
    );

    // Package internal (relative) barrel import
    // Original: import { getEcsResponseLog } from './logging';
    // 1. src/core/packages/http/server-internal/src/logging/index.ts (barrel)
    // 2. src/core/packages/http/server-internal/src/logging/get_response_log.ts (source)
    expect(httpServerFileContent).not.toMatch(/require\(['"]\.\/logging['"]\)/);
    expect(httpServerFileContent).toMatch(/require\(['"]\.\/logging\/get_response_log['"]\)/);

    // Node module with public subpaths
    // Original: import { firstValueFrom, pairwise, take } from 'rxjs';
    expect(httpServerFileContent).not.toMatch(/require\(['"]rxjs['"]\)/);
    expect(httpServerFileContent).toMatch(/require\(['"]rxjs\/internal\/firstValueFrom['"]\)/);

    // Single level barrel import
    // Original: import { modifyUrl } from '@kbn/std';
    // 1. src/platform/packages/shared/kbn-std/index.ts (barrel)
    // 2. src/platform/packages/shared/kbn-std/src/url.ts (source)
    const basePathFileContent = await Fsp.readFile(
      Path.join(CORE_SERVER_OUTPUT, 'base_path_service.js'),
      FILE_ENCODING
    );
    expect(basePathFileContent).not.toMatch(/require\(['"]@kbn\/std['"]\)/);
    expect(basePathFileContent).toMatch(/require\(['"]@kbn\/std\/src\/url['"]\)/);

    // Multi level barrel import
    // Original: import { SchemaTypeError, ValidationError } from '@kbn/config-schema';
    // 1. src/platform/packages/shared/kbn-config-schema/index.ts (barrel)
    // 2. src/platform/packages/shared/kbn-config-schema/src/errors/index.ts (barrel)
    // 3a. src/platform/packages/shared/kbn-config-schema/src/errors/schema_type_error.ts
    // 3b. src/platform/packages/shared/kbn-config-schema/src/errors/validation_error.ts
    const configServiceFileContent = await Fsp.readFile(
      Path.join(CONFIG_OUTPUT, 'config_service.js'),
      FILE_ENCODING
    );
    expect(configServiceFileContent).not.toMatch(/require\(['"]@kbn\/config-schema['"]\)/);
    expect(configServiceFileContent).not.toMatch(
      /require\(['"]@kbn\/config-schema\/src\/errors['"]\)/
    );
    expect(configServiceFileContent).toMatch(
      /require\(['"]@kbn\/config-schema\/src\/errors\/schema_type_error['"]\)/
    );
    expect(configServiceFileContent).toMatch(
      /require\(['"]@kbn\/config-schema\/src\/errors\/validation_error['"]\)/
    );

    // Nested export * chain with local exports
    // Original: import { calcFieldCounts } from '@kbn/discover-utils';
    // 1. src/platform/packages/shared/kbn-discover-utils/index.ts (barrel)
    // 2. src/platform/packages/shared/kbn-discover-utils/src/index.ts: export * from './utils'
    // 3. src/platform/packages/shared/kbn-discover-utils/src/utils/index.ts: export * from './calc_field_counts'
    // 4. src/platform/packages/shared/kbn-discover-utils/src/utils/calc_field_counts.ts (source)
    const dataTableCopyRowsFileContent = await Fsp.readFile(
      Path.join(UNIFIED_DATA_TABLE_OUTPUT, 'components', 'data_table_copy_rows_as_text.js'),
      FILE_ENCODING
    );
    expect(dataTableCopyRowsFileContent).not.toMatch(/require\(['"]@kbn\/discover-utils['"]\)/);
    expect(dataTableCopyRowsFileContent).toMatch(
      /require\(['"]@kbn\/discover-utils\/src\/utils\/calc_field_counts['"]\)/
    );
  });
});
