/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Validates Discover Scout perf bundle plugin labels for legacy webpack vs unified RSPack.
 * [rspack-transition] Collapse to RSPack-only when the legacy optimizer is removed.
 */
export function evaluateDiscoverBundlePluginAssertion(
  loadedPluginNamesSorted: string[],
  expectedPlugins: string[],
  rspackOnlyBundleLabels: readonly string[]
): { ok: true } | { ok: false; detail: string } {
  const usesRspackBundles =
    process.env.KBN_USE_RSPACK === 'true' || process.env.KBN_USE_RSPACK === '1';
  const sortedExpected = [...expectedPlugins].sort((a, b) => a.localeCompare(b));

  if (usesRspackBundles) {
    // In RSPack dist mode, only on-demand split chunks are captured during SPA
    // navigation. Named plugin entry chunks (plugin-discover, etc.) are preloaded
    // during bootstrap and not re-fetched. On-demand chunks get the aggregated
    // 'rspack-chunk' label. Validate that every loaded label is either in the
    // expected set, the RSPack-only allowlist, or a lazy-loaded named split chunk
    // (e.g. lazy_application_dependencies, lazySiemMigrationsService).
    const rspackAllowed = new Set([...expectedPlugins, ...rspackOnlyBundleLabels]);
    const subsetOk = loadedPluginNamesSorted.every(
      (name) => rspackAllowed.has(name) || name.startsWith('lazy')
    );
    if (subsetOk) {
      return { ok: true };
    }
    return {
      ok: false,
      detail: `RSPack: unexpected labels found. Loaded=${JSON.stringify(
        loadedPluginNamesSorted
      )}, allowed=${JSON.stringify([...rspackAllowed])}`,
    };
  }

  const legacyOk = loadedPluginNamesSorted.join('\0') === sortedExpected.join('\0');
  if (legacyOk) {
    return { ok: true };
  }
  return {
    ok: false,
    detail: `Legacy: expected ${JSON.stringify(sortedExpected)} got ${JSON.stringify(
      loadedPluginNamesSorted
    )}`,
  };
}
