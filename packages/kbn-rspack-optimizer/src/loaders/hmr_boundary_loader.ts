/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * HMR Boundary Loader
 * ===================
 *
 * Custom RSPack loader that injects `module.hot.accept()` into every file
 * containing React components, enabling React Fast Refresh for files that
 * would otherwise trigger a full page reload (10-30s in Kibana).
 *
 * ## Why this exists
 *
 * React Fast Refresh (`@rspack/plugin-react-refresh`) only self-accepts
 * modules where EVERY export is a React component. Files with mixed exports
 * (e.g. `discover_router.tsx` exporting both `DiscoverRouter` and
 * `getReadOnlyBadge`) are deliberately skipped by the plugin, causing HMR
 * updates to propagate up the module graph with no boundary to catch them —
 * resulting in a full page reload.
 *
 * This is the same approach used by Vite's React plugin. Create React App
 * does not solve this (full reload for mixed exports). Next.js uses a similar
 * strategy for client components.
 *
 * ## How detection works
 *
 * Content-based detection with fast bail-out — no path filtering, no AST
 * parsing. Automatically covers any React file regardless of location.
 *
 * 1. Check for `$RefreshReg$` in source (SWC injects this for every React
 *    component when `jsc.transform.react.refresh` is enabled). If absent,
 *    return source unchanged. Cost: one `string.includes()` call.
 *
 * 2. If present, append a footer with `module.hot.accept()` + dispose logic.
 *    Also extract component names from `$RefreshReg$` calls and all exported
 *    names to detect non-component exports for the stale export warning.
 *
 * ## Loader chain position
 *
 *   builtin:swc-loader            (1st) — TS → JS, adds $RefreshReg$ calls
 *   hmr_boundary_loader           (2nd) — detects $RefreshReg$, appends accept
 *   builtin:react-refresh-loader  (3rd) — appends refresh runtime footer
 *
 * The react-refresh-loader runs last because its rule is unshifted to the
 * beginning of the rules array by `@rspack/plugin-react-refresh`. For
 * mixed-export modules, its runtime detects the module is NOT a "refresh
 * boundary" and would normally call `invalidate()`. However, since our
 * loader already made the module self-accepting, the runtime's `invalidate()`
 * is never reached (it only fires when `prevExports` is defined, which
 * requires the runtime's own `dispose` handler — only registered for
 * pure-component boundary modules).
 *
 * ## Stale export trade-off
 *
 * When a mixed-export file self-accepts:
 * - Component exports: updated correctly via Fast Refresh registry, state
 *   preserved, re-rendered immediately.
 * - Non-component exports (functions, constants): updated within the module's
 *   own scope, but remain stale in OTHER modules that imported them.
 *
 * This is acceptable because:
 * - Development-mode only (loader active only when `hmr: true`)
 * - The component being edited re-renders correctly (primary use case)
 * - A console warning names the stale exports (max 3 shown, then "and N more")
 * - A page refresh resolves it immediately
 *
 * ## Runtime API
 *
 * Uses `__react_refresh_utils__.enqueueUpdate()` (provided globally by
 * `@rspack/plugin-react-refresh` via ProvidePlugin) to trigger the debounced
 * `performReactRefresh()` call after a module re-executes. This is the same
 * mechanism used by the plugin's own runtime for pure-component modules.
 *
 * ## When full page refresh still occurs
 *
 * Only for changes to non-React structural files not in any React component's
 * dependency tree: plugin entry files, configuration modules, bootstrap code.
 *
 * ## Build performance
 *
 * - Non-React files: one `string.includes()` call, returns immediately
 * - React files: regex extraction + string concatenation, sub-millisecond
 * - No AST parsing, no path-based filtering
 */

const REFRESH_REG_MARKER = '$RefreshReg$';

const REFRESH_REG_PATTERN = /\$RefreshReg\$\(\s*(\w+)\s*,\s*"(\w+)"\s*\)/g;

const EXPORT_CONST_PATTERN = /export\s+(?:const|let|var)\s+(\w+)\b/g;
const EXPORT_FUNCTION_PATTERN = /export\s+function\s+(\w+)\b/g;
const EXPORT_CLASS_PATTERN = /export\s+class\s+(\w+)\b/g;
const EXPORT_DEFAULT_FUNCTION_PATTERN = /export\s+default\s+function\s+(\w+)\b/g;
const EXPORT_DEFAULT_CLASS_PATTERN = /export\s+default\s+class\s+(\w+)\b/g;
const EXPORT_LIST_PATTERN = /export\s*\{([^}]+)\}/g;

function extractRefreshRegNames(source: string): Set<string> {
  const names = new Set<string>();
  let match;
  REFRESH_REG_PATTERN.lastIndex = 0;
  while ((match = REFRESH_REG_PATTERN.exec(source)) !== null) {
    names.add(match[2]);
  }
  return names;
}

function extractExportedNames(source: string): Set<string> {
  const names = new Set<string>();

  const patterns = [
    EXPORT_CONST_PATTERN,
    EXPORT_FUNCTION_PATTERN,
    EXPORT_CLASS_PATTERN,
    EXPORT_DEFAULT_FUNCTION_PATTERN,
    EXPORT_DEFAULT_CLASS_PATTERN,
  ];

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(source)) !== null) {
      names.add(match[1]);
    }
  }

  EXPORT_LIST_PATTERN.lastIndex = 0;
  let listMatch;
  while ((listMatch = EXPORT_LIST_PATTERN.exec(source)) !== null) {
    const items = listMatch[1].split(',');
    for (const item of items) {
      const trimmed = item.trim();
      if (!trimmed) continue;
      const asMatch = trimmed.match(/(\w+)\s+as\s+(\w+)/);
      if (asMatch) {
        names.add(asMatch[2]);
      } else {
        names.add(trimmed);
      }
    }
  }

  return names;
}

function getNonComponentExports(source: string): string[] {
  const componentNames = extractRefreshRegNames(source);
  const exportedNames = extractExportedNames(source);

  const nonComponent: string[] = [];
  for (const name of exportedNames) {
    if (name === '__esModule') continue;
    if (!componentNames.has(name)) {
      nonComponent.push(name);
    }
  }
  return nonComponent;
}

function getFilename(resourcePath: string): string {
  const parts = resourcePath.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || resourcePath;
}

function buildFooter(filename: string, nonComponentExports: string[]): string {
  const hasMixedExports = nonComponentExports.length > 0;

  let warningBlock = '';
  if (hasMixedExports) {
    const namesJson = JSON.stringify(nonComponentExports);
    warningBlock = `
    if (module.hot.data && module.hot.data.__kbnHmrActive) {
      var __hmr_names = ${namesJson};
      var __hmr_display = __hmr_names.length <= 3
        ? __hmr_names.join(', ')
        : __hmr_names.slice(0, 3).join(', ') + ' and ' + (__hmr_names.length - 3) + ' more';
      console.warn(
        '[@kbn/rspack-optimizer][hmr] ' + ${JSON.stringify(filename)} + ' \\u2192 Fast Refresh. ' +
        'Non-component exports (' + __hmr_display + ') may be stale in importing modules. Refresh if needed.'
      );
    }`;
  }

  return `
// --- @kbn/rspack-optimizer HMR boundary ---
if (module.hot) {
  module.hot.accept();
  if (module.hot.data) {
    if (typeof __react_refresh_utils__ !== 'undefined') {
      __react_refresh_utils__.enqueueUpdate(function() {});
    }${warningBlock}
  }
  module.hot.dispose(function(data) {
    data.__kbnHmrActive = true;
  });
}
`;
}

/**
 * The loader entry point. Receives SWC-compiled JavaScript.
 * Appends HMR accept boundary for files containing React components.
 */
// eslint-disable-next-line import/no-default-export
export default function hmrBoundaryLoader(this: any, source: string): string {
  if (!source.includes(REFRESH_REG_MARKER)) {
    return source;
  }

  const filename = getFilename(this.resourcePath || '');
  const nonComponentExports = getNonComponentExports(source);
  const footer = buildFooter(filename, nonComponentExports);

  return source + footer;
}
