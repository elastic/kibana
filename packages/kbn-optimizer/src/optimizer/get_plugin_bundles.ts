/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import { Bundle } from '../common';
import { Limits } from './optimizer_config';

import { KibanaPlatformPlugin } from './kibana_platform_plugins';

export function getPluginBundles(
  plugins: KibanaPlatformPlugin[],
  repoRoot: string,
  outputRoot: string,
  limits: Limits
) {
  const xpackDirSlash = Path.resolve(repoRoot, 'x-pack') + Path.sep;

  return plugins
    .filter((p) => p.isUiPlugin)
    .map(
      (p) =>
        new Bundle({
          type: 'plugin',
          id: p.id,
          sourceRoot: repoRoot,
          contextDir: p.directory,
          outputDir: Path.resolve(
            outputRoot,
            Path.relative(repoRoot, p.directory),
            'target/public'
          ),
          manifestPath: p.manifestPath,
          banner: p.directory.startsWith(xpackDirSlash)
            ? `/*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements.\n` +
              ` * Licensed under the Elastic License 2.0; you may not use this file except in compliance with the Elastic License 2.0. */\n`
            : undefined,
          pageLoadAssetSizeLimit: limits.pageLoadAssetSize?.[p.id],
          remoteInfo: {
            pkgId: p.pkgId,
            targets: ['public', ...p.extraPublicDirs],
          },
          ignoreMetrics: p.ignoreMetrics,
        })
    );
}
