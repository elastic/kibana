/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { transformSync } from 'rolldown/experimental';
import type { Plugin } from 'vite';

/**
 * TypeScript transform plugin that replaces Vite's built-in OXC transform.
 *
 * Vite's OXC plugin calls `loadTsconfigJsonForFile` → `tsconfck.parse()` for
 * every TypeScript file, which runs `replaceTokens` (JSON.stringify → replaceAll
 * → JSON.parse) on potentially large tsconfig objects. In Kibana's monorepo with
 * 1256+ packages and large `paths` sections, this costs ~25% of startup CPU.
 *
 * This plugin bypasses tsconfig resolution entirely by providing pre-configured
 * compiler options directly to Rolldown's OXC transform. The transform options
 * match Kibana's common TypeScript settings:
 *   - JSX: automatic runtime with React import source
 *   - Target: ES2022 (Node 18+)
 *   - Source maps: disabled by default for faster startup
 *
 * This plugin should be used together with `oxc: false` in the Vite config
 * to disable the built-in OXC transform.
 */
export function kbnTypescriptTransformPlugin(): Plugin {
  const sourceMapsEnabled = process.env.KBN_VITE_SOURCEMAPS === 'true';

  // Pre-built regex for matching TypeScript files
  const tsRE = /\.(ts|tsx|mts|cts)$/;
  // Match JSX files that need React transform
  const jsxRE = /\.(tsx|jsx)$/;

  return {
    name: 'kbn-typescript-transform',
    // No enforce — runs in the same position as vite:oxc (normal priority)
    // This means it runs after 'pre' plugins (like our cache reader) and
    // before 'post' plugins (like our cache writer)

    // Forcibly remove the built-in vite:oxc plugin after config is resolved.
    // Setting `oxc: false` in the config should do this, but in practice the
    // built-in plugin still runs. This hook guarantees it's removed.
    configResolved(resolvedConfig: any) {
      const plugins = (resolvedConfig as any).plugins as { name: string }[];
      for (let i = plugins.length - 1; i >= 0; i--) {
        if (plugins[i].name === 'vite:oxc') {
          plugins.splice(i, 1);
        }
      }
    },

    transform(code: string, id: string) {
      // Skip virtual modules and node_modules
      if (id.startsWith('\0') || id.includes('node_modules')) {
        return null;
      }

      // Only transform TypeScript files
      if (!tsRE.test(id)) {
        return null;
      }

      // Determine the language from the file extension
      const ext = Path.extname(id).slice(1);
      let lang: 'ts' | 'tsx';
      if (ext === 'tsx') {
        lang = 'tsx';
      } else {
        // ts, mts, cts all use 'ts' lang
        lang = 'ts';
      }

      const result = transformSync(id, code, {
        lang,
        sourcemap: sourceMapsEnabled,

        // JSX settings — matches Kibana's tsconfig jsx: "react-jsx"
        jsx: jsxRE.test(id)
          ? {
              runtime: 'automatic',
              importSource: 'react',
              development: true,
            }
          : undefined,

        // TypeScript settings — matches ES2022+ defaults
        // useDefineForClassFields: true (default for ES2022+), so
        // setPublicClassFields should be false
        assumptions: {
          setPublicClassFields: false,
        },
        typescript: {
          onlyRemoveTypeImports: false,
          removeClassFieldsWithoutInitializer: false,
        },
      });

      if (result.errors.length > 0) {
        const firstError = result.errors[0];
        throw new Error(`TypeScript transform error in ${id}: ${firstError.message}`);
      }

      return {
        code: result.code,
        map: sourceMapsEnabled ? result.map : null,
      };
    },
  };
}
