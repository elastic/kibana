/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { rspack, type Compiler } from '@rspack/core';

/**
 * Elastic License 2.0 banner for x-pack plugin bundles.
 *
 * This is the exact text the legacy webpack optimizer prepends to every output
 * chunk of x-pack plugin compilations via `webpack.BannerPlugin({ raw: true })`.
 * The `/*!` prefix ensures the comment survives minification (both SWC and
 * Terser preserve `/*!` comments by default).
 *
 * This is intentionally NOT the same as the triple-license source file header
 * (`TRIPLE_ELV2_SSPL1_AGPL3_LICENSE_HEADER` in `.eslintrc.js`) or the
 * multi-line `ELV2_LICENSE_HEADER` — those are for source files and have
 * different formatting and, in the triple case, different license scope.
 */
export const XPACK_ELASTIC_LICENSE_BANNER =
  `/*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements.\n` +
  ` * Licensed under the Elastic License 2.0; you may not use this file except in compliance with the Elastic License 2.0. */\n`;

/**
 * Rspack plugin that selectively prepends the Elastic License 2.0 banner
 * to x-pack plugin chunks in the single compilation.
 *
 * The legacy webpack optimizer ran one compilation per plugin and used
 * `webpack.BannerPlugin` on each x-pack compilation. The rspack optimizer
 * uses a single compilation for all plugins, so this plugin identifies
 * x-pack chunks by their **chunk name** (e.g., `plugin-discover`) — stable
 * regardless of output filename hashing — and prepends the banner only to
 * those chunks' `.js` assets.
 *
 * X-pack detection uses the same directory-prefix heuristic as the legacy
 * optimizer: plugins whose `contextDir` lives under `<repoRoot>/x-pack/`
 * are considered x-pack plugins.
 *
 * CSS is injected via `style-loader` (not extracted to files), so only
 * `.js` files need bannering. Shared vendor/split chunks contain third-party
 * code and are excluded.
 */
export class XPackBannerPlugin {
  private readonly xpackChunkNames: Record<string, true>;

  constructor(repoRoot: string, plugins: ReadonlyArray<{ id: string; contextDir: string }>) {
    const xpackDirPrefix = Path.resolve(repoRoot, 'x-pack') + Path.sep;
    this.xpackChunkNames = Object.create(null);
    for (const p of plugins) {
      if (p.contextDir.startsWith(xpackDirPrefix)) {
        this.xpackChunkNames[`plugin-${p.id}`] = true;
      }
    }
  }

  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap('XPackBannerPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'XPackBannerPlugin',
          stage: rspack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        () => {
          for (const chunk of compilation.chunks) {
            if (!chunk.name || !this.xpackChunkNames[chunk.name]) {
              continue;
            }

            for (const file of chunk.files) {
              if (!file.endsWith('.js')) {
                continue;
              }

              const existing = compilation.getAsset(file);
              if (!existing) {
                continue;
              }

              compilation.updateAsset(
                file,
                new rspack.sources.ConcatSource(
                  new rspack.sources.RawSource(XPACK_ELASTIC_LICENSE_BANNER),
                  existing.source
                )
              );
            }
          }
        }
      );
    });
  }
}
