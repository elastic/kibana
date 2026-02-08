/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { type ViteDevServer, isRunnableDevEnvironment } from 'vite';
import type { ModuleRunner } from 'vite/module-runner';

import type { ViteModuleRunner, ModuleExecuteResult, ViteServerOptions } from './types.ts';

/**
 * Creates a module runner using Vite's native Module Runner API (Vite 6+)
 *
 * The Module Runner API provides first-party support for executing server-side
 * code using Vite's transformation pipeline. This enables:
 * - TypeScript/ESM execution without pre-compilation
 * - Native source map support (automatic stack trace rewriting)
 * - Module caching for performance
 * - Integrated HMR support via Vite's environment system
 *
 * In Vite 8, the SSR environment is a RunnableDevEnvironment by default,
 * which provides a built-in ModuleRunner that executes modules in the same
 * process as the Vite server. This is the recommended approach for SSR.
 */
export async function createModuleRunner(
  viteServer: ViteDevServer,
  options: ViteServerOptions
): Promise<ViteModuleRunner> {
  // Get the SSR environment from the Vite server
  // In Vite 6+, environments are first-class citizens
  const ssrEnvironment = viteServer.environments.ssr;

  if (!ssrEnvironment) {
    throw new Error('SSR environment not found. Ensure Vite server has SSR enabled.');
  }

  // Verify this is a RunnableDevEnvironment (runs in same process)
  // This is the default for SSR environments in Vite
  if (!isRunnableDevEnvironment(ssrEnvironment)) {
    throw new Error(
      'SSR environment is not a RunnableDevEnvironment. ' +
        'Kibana requires the SSR environment to run in the same process.'
    );
  }

  // Get the ModuleRunner from the RunnableDevEnvironment
  // The runner is lazily created on first access
  // Note: Accessing `runner` enables source map support via process.setSourceMapsEnabled
  const runner: ModuleRunner = ssrEnvironment.runner;

  // ── Performance patches for module runner ──────────────────────────
  //
  // Patch 1: Reorder cachedRequest to check mod.exports FIRST
  //
  // Vite's cachedRequest (line 1045 of module-runner.js) does:
  //   if ((callstack.includes(id) || isCircularModule(mod) || isCircularImport(importers, id)) && mod.exports)
  //
  // The expensive circularity checks run BEFORE checking mod.exports.
  // During startup, the vast majority of modules haven't been evaluated
  // yet (mod.exports is undefined), so all that graph traversal is wasted.
  // By checking mod.exports first, we skip circularity checks entirely
  // for unevaluated modules — eliminating ~12% of startup CPU.
  //
  // Patch 2: Iterative isCircularImport (for the cases that DO run)
  //
  // For modules that have been partially evaluated (circular imports),
  // use iterative DFS instead of recursive DFS to reduce function call
  // overhead and GC pressure.

  const runnerAny = runner as any;

  // Patch cachedRequest to check mod.exports first
  if (typeof runnerAny.cachedRequest === 'function') {
    const originalProcessImport = runnerAny.processImport.bind(runnerAny);
    const originalDirectRequest = runnerAny.directRequest.bind(runnerAny);

    runnerAny.cachedRequest = async function cachedRequest(
      url: string,
      mod: any,
      callstack: string[] = [],
      metadata?: any
    ) {
      const meta = mod.meta;
      const moduleId = meta.id;
      const { importers } = mod;
      const importee = callstack[callstack.length - 1];

      // Side effect: register the importer relationship
      if (importee) {
        importers.add(importee);
      }

      // ── Circular import detection (optimized) ──────────────────────
      //
      // Vite's original check runs isCircularImport for EVERY import,
      // including re-imports of already-evaluated modules. This costs
      // ~12% of startup CPU because most imports during startup are
      // shared dependencies (React, lodash, etc.) that are imported
      // from hundreds of places.
      //
      // The circularity check only matters when a module is CURRENTLY
      // being evaluated (mod.evaluated === false, mod.promise pending).
      // For fully evaluated modules, the mod.promise path below handles
      // them correctly (promise is already resolved, await is instant).
      //
      // Guard: only run circularity checks when the module is mid-evaluation.
      if (
        !mod.evaluated &&
        mod.exports &&
        (callstack.includes(moduleId) ||
          this.isCircularModule(mod) ||
          this.isCircularImport(importers, moduleId))
      ) {
        return originalProcessImport(mod.exports, meta, metadata);
      }

      let debugTimer: ReturnType<typeof setTimeout> | undefined;
      if (this.debug) {
        debugTimer = setTimeout(() => {
          this.debug(
            `[module runner] module ${moduleId} takes over 2s to load.\nstack:\n${[...callstack, moduleId]
              .reverse()
              .map((p: string) => `  - ${p}`)
              .join('\n')}`
          );
        }, 2000);
      }

      try {
        // If there's already a promise in-flight, wait for it
        if (mod.promise) {
          return originalProcessImport(await mod.promise, meta, metadata);
        }
        // Otherwise, start a new request
        const promise = originalDirectRequest(url, mod, callstack);
        mod.promise = promise;
        mod.evaluated = false;
        return originalProcessImport(await promise, meta, metadata);
      } finally {
        mod.evaluated = true;
        if (debugTimer) clearTimeout(debugTimer);
      }
    };
  }

  // Patch isCircularImport with iterative DFS (for the remaining calls)
  if (typeof runnerAny.isCircularImport === 'function') {
    runnerAny.isCircularImport = function isCircularImport(
      importers: Set<string>,
      moduleUrl: string,
      visited?: Set<string>
    ): boolean {
      if (!visited) {
        visited = new Set<string>();
      }
      // Iterative DFS using an explicit stack
      const stack: string[] = [];
      for (const imp of importers) {
        stack.push(imp);
      }
      while (stack.length > 0) {
        const importer = stack.pop()!;
        if (visited.has(importer)) {
          continue;
        }
        visited.add(importer);
        if (importer === moduleUrl) {
          return true;
        }
        const mod = this.evaluatedModules.getModuleById(importer);
        if (mod && mod.importers.size > 0) {
          for (const parentImporter of mod.importers) {
            if (!visited.has(parentImporter)) {
              stack.push(parentImporter);
            }
          }
        }
      }
      return false;
    };
  }

  // Track module dependencies for HMR
  const moduleDependencies = new Map<string, Set<string>>();

  // Wrap the runner with our interface
  const moduleRunner: ViteModuleRunner = {
    async executeModule<T = unknown>(moduleId: string): Promise<ModuleExecuteResult<T>> {
      // Resolve the module path if it's relative
      const resolvedId = resolveModuleId(moduleId, options.repoRoot);

      // Execute the module through Vite's Module Runner
      // This is equivalent to the old server.ssrLoadModule(url)
      const exports = await runner.import(resolvedId);

      // Track dependencies from the module graph
      const deps = getModuleDependencies(ssrEnvironment, resolvedId);
      moduleDependencies.set(resolvedId, deps);

      return {
        exports: exports as T,
        dependencies: Array.from(deps),
      };
    },

    invalidateModule(moduleId: string): void {
      const resolvedId = resolveModuleId(moduleId, options.repoRoot);

      // Invalidate in Vite's module graph for the SSR environment
      const mod = ssrEnvironment.moduleGraph.getModuleById(resolvedId);
      if (mod) {
        ssrEnvironment.moduleGraph.invalidateModule(mod);
      }

      // Notify callback if provided
      if (options.onModuleInvalidated) {
        options.onModuleInvalidated(resolvedId);
      }
    },

    getCachedModuleIds(): string[] {
      // Get all modules from the SSR environment's module graph
      const modules: string[] = [];
      for (const mod of ssrEnvironment.moduleGraph.idToModuleMap.values()) {
        if (mod.id) {
          modules.push(mod.id);
        }
      }
      return modules;
    },

    clearCache(): void {
      // Clear the module runner's cache
      runner.clearCache();
      moduleDependencies.clear();
    },

    async close(): Promise<void> {
      // Clean up the module runner
      await runner.close();
      moduleDependencies.clear();
    },
  };

  // Set up HMR handling if enabled
  if (options.hmr !== false) {
    setupHmrHandling(viteServer, ssrEnvironment, moduleRunner, options);
  }

  return moduleRunner;
}

/**
 * Resolve a module ID to an absolute path
 */
function resolveModuleId(moduleId: string, repoRoot: string): string {
  if (Path.isAbsolute(moduleId)) {
    return moduleId;
  }

  // Handle @kbn/* imports - these will be resolved by Vite's resolver
  if (moduleId.startsWith('@kbn/')) {
    return moduleId;
  }

  // Resolve relative paths against repo root
  return Path.resolve(repoRoot, moduleId);
}

/**
 * DevEnvironment interface with moduleGraph
 * Types match Vite's EnvironmentModuleNode where id is string | null
 */
interface DevEnvironmentWithModuleGraph {
  moduleGraph: {
    getModuleById(
      id: string
    ): { id: string | null; importedModules: Set<{ id: string | null }> } | undefined;
    idToModuleMap: Map<string, { id: string | null }>;
    invalidateModule(mod: unknown): void;
  };
  hot?: {
    on?(event: string, callback: () => void): void;
  };
}

/**
 * Get module dependencies from Vite's module graph
 */
function getModuleDependencies(
  ssrEnvironment: DevEnvironmentWithModuleGraph,
  moduleId: string
): Set<string> {
  const deps = new Set<string>();

  const mod = ssrEnvironment.moduleGraph.getModuleById(moduleId);
  if (mod) {
    for (const dep of mod.importedModules) {
      if (dep.id) {
        deps.add(dep.id);
      }
    }
  }

  return deps;
}

/**
 * Module node in Vite's module graph
 * Note: id is string | null in Vite's types
 */
interface ModuleNode {
  id: string | null;
  importers: Set<ModuleNode>;
}

/**
 * Set up HMR handling for server-side modules using Vite's environment system.
 *
 * Uses debouncing to batch rapid file changes (e.g. git checkout, bulk save)
 * into a single importer-chain walk and invalidation pass.
 */
function setupHmrHandling(
  viteServer: ViteDevServer,
  ssrEnvironment: DevEnvironmentWithModuleGraph,
  moduleRunner: ViteModuleRunner,
  options: ViteServerOptions
): void {
  // Debounce buffer — accumulates changed file paths and flushes after a delay
  let pendingChanges = new Set<string>();
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const DEBOUNCE_MS = 50; // 50ms batching window for rapid file changes

  function flushChanges() {
    debounceTimer = null;
    if (pendingChanges.size === 0) return;

    const changesToProcess = pendingChanges;
    pendingChanges = new Set();

    const allAffectedModules: string[] = [];
    const visited = new Set<string>();

    for (const filePath of changesToProcess) {
      // Check if this file is in our module graph
      const mod = ssrEnvironment.moduleGraph.getModuleById(filePath) as ModuleNode | undefined;
      if (!mod) {
        continue;
      }

      allAffectedModules.push(filePath);

      // Walk up the importer chain to find all affected modules
      const queue: ModuleNode[] = [mod];

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (current.id && !visited.has(current.id)) {
          visited.add(current.id);
          allAffectedModules.push(current.id);

          // Add importers to the queue
          for (const importer of current.importers) {
            queue.push(importer);
          }
        }
      }
    }

    // Invalidate affected modules
    for (const moduleId of allAffectedModules) {
      moduleRunner.invalidateModule(moduleId);
    }

    // Notify about affected modules
    if (allAffectedModules.length > 0 && options.onHmrUpdate) {
      options.onHmrUpdate(allAffectedModules);
    }
  }

  // Listen for module updates from Vite's HMR system
  viteServer.watcher.on('change', (filePath) => {
    pendingChanges.add(filePath);

    // Reset the debounce timer on each new change
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(flushChanges, DEBOUNCE_MS);
  });

  // Handle full reloads when needed
  // In Vite 6+, the hot channel is part of the environment
  if (ssrEnvironment.hot && ssrEnvironment.hot.on) {
    ssrEnvironment.hot.on('vite:beforeFullReload', () => {
      // Flush any pending changes before clearing cache
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      pendingChanges.clear();
      moduleRunner.clearCache();
    });
  }
}

/**
 * Resolves a module path relative to the repo root
 */
export function resolveModulePath(repoRoot: string, modulePath: string): string {
  if (modulePath.startsWith('/') || modulePath.startsWith(repoRoot)) {
    return modulePath;
  }

  // Handle @kbn/* imports
  if (modulePath.startsWith('@kbn/')) {
    // These will be resolved by Vite's resolver
    return modulePath;
  }

  return `${repoRoot}/${modulePath}`;
}
