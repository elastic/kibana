/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Path from 'path';

import { Bundle } from '../common';

import { KibanaPlatformPlugin } from './kibana_platform_plugins';

export function getPluginBundles(
  plugins: KibanaPlatformPlugin[],
  repoRoot: string,
  outputRoot: string
) {
  const xpackDirSlash = Path.resolve(repoRoot, 'x-pack') + Path.sep;

  return plugins
    .filter((p) => p.isUiPlugin)
    .map(
      (p) =>
        new Bundle({
          type: 'plugin',
          id: p.id,
          publicDirNames: ['public', ...p.extraPublicDirs],
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
              ` * Licensed under the Elastic License; you may not use this file except in compliance with the Elastic License. */\n`
            : undefined,
        })
    );
}
