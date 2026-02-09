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
 * OXC-based transform plugin that replaces both Vite's built-in OXC (`vite:oxc`)
 * and esbuild (`vite:esbuild`) plugins.
 *
 * Handles all source file types: .ts, .tsx, .js, .jsx, .mts, .cts
 *
 * Vite's built-in OXC plugin calls `loadTsconfigJsonForFile` → `tsconfck.parse()`
 * for every TypeScript file, which runs `replaceTokens` (JSON.stringify →
 * replaceAll → JSON.parse) on potentially large tsconfig objects. In Kibana's
 * monorepo with 1256+ packages and large `paths` sections, this costs ~25% of
 * startup CPU.
 *
 * This plugin bypasses tsconfig resolution entirely by providing pre-configured
 * compiler options directly to Rolldown's OXC transform:
 *   - JSX: automatic runtime with React import source (respects @jsxRuntime pragmas)
 *   - Target: ES2022 (Node 18+)
 *   - Source maps: disabled by default for faster startup
 *
 * Use together with `oxc: false` and `esbuild: false` in the Vite config.
 */
export function kbnTypescriptTransformPlugin(): Plugin {
  const sourceMapsEnabled = process.env.KBN_VITE_SOURCEMAPS === 'true';

  // Match all source file types that need transformation
  const sourceRE = /\.(ts|tsx|js|jsx|mts|cts)$/;
  // Match files that can contain JSX syntax
  const jsxRE = /\.(tsx|jsx)$/;

  return {
    name: 'kbn-typescript-transform',
    // No enforce — runs in the same position as vite:oxc (normal priority)
    // This means it runs after 'pre' plugins (like our cache reader) and
    // before 'post' plugins (like our cache writer)

    // Forcibly remove the built-in vite:oxc and vite:esbuild plugins after
    // config is resolved. Setting `oxc: false` and `esbuild: false` in the
    // config should do this, but in practice the built-in plugins may still
    // run. This hook guarantees they're removed.
    configResolved(resolvedConfig: any) {
      const plugins = (resolvedConfig as any).plugins as { name: string }[];
      for (let i = plugins.length - 1; i >= 0; i--) {
        const name = plugins[i].name;
        if (name === 'vite:oxc' || name === 'vite:esbuild') {
          plugins.splice(i, 1);
        }
      }
    },

    transform(code: string, id: string) {
      // Skip virtual modules and node_modules
      // Use '/node_modules/' path segment check (not substring match) to avoid
      // false positives on files whose names contain 'node_modules' as a
      // substring (e.g. find_used_node_modules.ts).
      if (id.startsWith('\0') || id.includes('/node_modules/')) {
        return null;
      }

      // Only transform source files
      if (!sourceRE.test(id)) {
        return null;
      }

      // Determine the OXC language from the file extension
      const ext = Path.extname(id).slice(1);
      let lang: 'ts' | 'tsx' | 'js' | 'jsx';
      switch (ext) {
        case 'tsx':
          lang = 'tsx';
          break;
        case 'jsx':
          lang = 'jsx';
          break;
        case 'js':
          // .js files that contain JSX syntax need the 'jsx' lang so OXC
          // parses angle brackets as JSX elements rather than comparisons.
          // We detect this by looking for closing tags (`</`) which are
          // unambiguous JSX markers that can't appear in regular JS.
          lang = code.includes('</') ? 'jsx' : 'js';
          break;
        default:
          // ts, mts, cts
          lang = 'ts';
          break;
      }

      // Determine JSX configuration.
      // Some files use `/** @jsxRuntime classic */` (e.g. for Emotion's css prop)
      // which requires `runtime: 'classic'` and must NOT have `importSource`.
      // Detect the pragma and configure accordingly.
      const needsJsx = jsxRE.test(id) || lang === 'jsx';
      let jsx:
        | { runtime: 'automatic' | 'classic'; importSource?: string; development: boolean }
        | undefined;
      if (needsJsx) {
        if (code.includes('@jsxRuntime classic')) {
          jsx = { runtime: 'classic', development: true };
        } else {
          jsx = { runtime: 'automatic', importSource: 'react', development: true };
        }
      }

      const result = transformSync(id, code, {
        lang,
        sourcemap: sourceMapsEnabled,

        // JSX settings — matches Kibana's tsconfig jsx: "react-jsx"
        // Respects @jsxRuntime classic pragma for Emotion css prop usage
        jsx,

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
        throw new Error(`OXC transform error in ${id}: ${firstError.message}`);
      }

      return {
        code: result.code,
        map: sourceMapsEnabled ? result.map : null,
      };
    },
  };
}
