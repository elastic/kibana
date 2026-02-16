/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ts from 'typescript';
import * as path from 'path';
import type { TaskContext, TelemetryRoot } from './task_context';
import { extractCollectors, getProgramPaths } from '../extract_collectors';
import { createKibanaProgram, getAllSourceFiles } from '../ts_program';
import { parseUsageCollection } from '../ts_parser';

export interface ExtractCollectorsOptions {
  /** Restrict to exact collector file paths (--path flag) */
  restrictProgramToPath?: string | string[];
  /** Filter to only scan within these package directories */
  packageFilter?: string[];
}

export function extractCollectorsTask(
  { roots }: TaskContext,
  options?: string | string[] | ExtractCollectorsOptions
) {
  // Support legacy signature: extractCollectorsTask(context, restrictProgramToPath)
  const opts: ExtractCollectorsOptions =
    typeof options === 'string' || Array.isArray(options)
      ? { restrictProgramToPath: options }
      : options || {};

  const { restrictProgramToPath, packageFilter } = opts;

  // Convert package filter to full paths for comparison
  const packageFilterPaths = packageFilter?.map((pkg) => path.resolve(process.cwd(), pkg));

  // If we have a package filter, use optimized single-program approach
  if (packageFilterPaths && packageFilterPaths.length > 0) {
    // Return a single task that creates ONE TypeScript program for all packages
    return [
      {
        task: async () => {
          const tsConfig = getTsConfig();

          // Collect all file paths from all packages in parallel
          const allPathPromises = packageFilterPaths.map((pkgPath) =>
            getProgramPaths({
              root: pkgPath,
              exclude: [],
            }).catch(() => [])
          );

          const pathArrays = await Promise.all(allPathPromises);

          let allProgramPaths = pathArrays.flat();

          if (allProgramPaths.length === 0) {
            return; // No files to process
          }

          // Apply path restriction if specified
          if (typeof restrictProgramToPath !== 'undefined') {
            const restrictProgramToPaths = Array.isArray(restrictProgramToPath)
              ? restrictProgramToPath
              : [restrictProgramToPath];

            const fullRestrictedPaths = restrictProgramToPaths.map((p) =>
              path.resolve(process.cwd(), p)
            );

            allProgramPaths = allProgramPaths.filter((p) => fullRestrictedPaths.includes(p));

            if (allProgramPaths.length === 0) {
              return;
            }
          }

          // Create a SINGLE TypeScript program for all files
          const program = createKibanaProgram(allProgramPaths, tsConfig);
          const sourceFiles = getAllSourceFiles(allProgramPaths, program);

          // Pre-compute resolved root paths for faster lookup
          const rootLookup = createRootLookup(roots);

          // Extract collectors and assign to appropriate roots
          for (const sourceFile of sourceFiles) {
            const collectors = [...parseUsageCollection(sourceFile, program)];

            if (collectors.length > 0) {
              const root = findRootForPath(sourceFile.fileName, rootLookup);

              if (root) {
                if (!root.parsedCollections) {
                  root.parsedCollections = [];
                }

                root.parsedCollections.push(...collectors);
              }
            }
          }
        },
        title: `Extracting collectors from ${packageFilterPaths.length} package(s) (single program)`,
      },
    ];
  }

  // No package filter - scan entire roots (original behavior, one program per root)
  return roots.map((root) => ({
    task: async () => {
      const tsConfig = getTsConfig();
      const programPaths = await getProgramPaths(root.config);

      if (programPaths.length === 0) {
        return;
      }

      // Apply path restriction if specified
      let pathsToProcess = programPaths;

      if (typeof restrictProgramToPath !== 'undefined') {
        const restrictProgramToPaths = Array.isArray(restrictProgramToPath)
          ? restrictProgramToPath
          : [restrictProgramToPath];

        const fullRestrictedPaths = restrictProgramToPaths.map((p) =>
          path.resolve(process.cwd(), p)
        );

        pathsToProcess = programPaths.filter((p) => fullRestrictedPaths.includes(p));

        if (pathsToProcess.length === 0) {
          return;
        }
      }

      root.parsedCollections = [...extractCollectors(pathsToProcess, tsConfig)];
    },
    title: `Extracting collectors in ${root.config.root}`,
  }));
}

/** Finds the tsconfig.json file or throws an error */
function getTsConfig(): string {
  const tsConfig = ts.findConfigFile('./', ts.sys.fileExists, 'tsconfig.json');
  if (!tsConfig) {
    throw new Error('Could not find a valid tsconfig.json.');
  }
  return tsConfig;
}

interface RootLookupEntry {
  resolvedPath: string;
  root: TelemetryRoot;
}

/**
 * Pre-computes resolved root paths for faster lookup.
 */
function createRootLookup(roots: TelemetryRoot[]): RootLookupEntry[] {
  return roots.map((root) => ({
    resolvedPath: path.resolve(process.cwd(), root.config.root) + path.sep,
    root,
  }));
}

/**
 * Determines which root a file path belongs to using pre-computed lookup.
 */
function findRootForPath(filePath: string, lookup: RootLookupEntry[]): TelemetryRoot | undefined {
  for (const entry of lookup) {
    if (filePath.startsWith(entry.resolvedPath)) {
      return entry.root;
    }
  }
  return undefined;
}
