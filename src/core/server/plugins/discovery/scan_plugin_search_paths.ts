/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PathLike, readdir, stat, Stats } from 'fs';
import { resolve } from 'path';
import { bindNodeCallback, from, Observable } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { Logger } from '../../logging';
import { PluginDiscoveryError } from './plugin_discovery_error';

const fsReadDir$ = bindNodeCallback<[string], [string[]]>(readdir);
const fsStat$ = bindNodeCallback<[PathLike], [Stats]>(stat);

const maxScanDepth = 5;

interface PluginSearchPathEntry {
  dir: string;
  depth: number;
}

/**
 * Recursively iterates over every plugin search path and returns a merged stream of all
 * sub-directories containing a manifest file. If directory cannot be read or it's impossible to get stat
 * for any of the nested entries then error is added into the stream instead.
 *
 * @param pluginDirs List of the top-level directories to process.
 * @param log Plugin discovery logger instance.
 */
export function scanPluginSearchPaths(
  pluginDirs: readonly string[],
  log: Logger
): Observable<string | PluginDiscoveryError> {
  function recursiveScanFolder(
    ent: PluginSearchPathEntry
  ): Observable<string | PluginDiscoveryError> {
    return from([ent]).pipe(
      mergeMap((entry) => {
        return findManifestInFolder(entry.dir, () => {
          if (entry.depth > maxScanDepth) {
            return [];
          }
          return mapSubdirectories(entry.dir, (subDir) =>
            recursiveScanFolder({ dir: subDir, depth: entry.depth + 1 })
          );
        });
      })
    );
  }

  return from(pluginDirs.map((dir) => ({ dir, depth: 0 }))).pipe(
    mergeMap((entry) => {
      log.debug(`Scanning "${entry.dir}" for plugin sub-directories...`);
      return fsReadDir$(entry.dir).pipe(
        mergeMap(() => recursiveScanFolder(entry)),
        catchError((err) => [PluginDiscoveryError.invalidSearchPath(entry.dir, err)])
      );
    })
  );
}

/**
 * Attempts to read manifest file in specified directory or calls `notFound` and returns results if not found. For any
 * manifest files that cannot be read, a PluginDiscoveryError is added.
 * @param dir
 * @param notFound
 */
function findManifestInFolder(
  dir: string,
  notFound: () => never[] | Observable<string | PluginDiscoveryError>
): string[] | Observable<string | PluginDiscoveryError> {
  return fsStat$(resolve(dir, 'kibana.json')).pipe(
    mergeMap((stats) => {
      // `kibana.json` exists in given directory, we got a plugin
      if (stats.isFile()) {
        return [dir];
      }
      return [];
    }),
    catchError((manifestStatError) => {
      // did not find manifest. recursively process sub directories until we reach max depth.
      if (manifestStatError.code !== 'ENOENT') {
        return [PluginDiscoveryError.invalidPluginPath(dir, manifestStatError)];
      }
      return notFound();
    })
  );
}

/**
 * Finds all subdirectories in `dir` and executed `mapFunc` for each one. For any directories that cannot be read,
 * a PluginDiscoveryError is added.
 * @param dir
 * @param mapFunc
 */
function mapSubdirectories(
  dir: string,
  mapFunc: (subDir: string) => Observable<string | PluginDiscoveryError>
): Observable<string | PluginDiscoveryError> {
  return fsReadDir$(dir).pipe(
    mergeMap((subDirs: string[]) => subDirs.map((subDir) => resolve(dir, subDir))),
    mergeMap((subDir) =>
      fsStat$(subDir).pipe(
        mergeMap((pathStat) => (pathStat.isDirectory() ? mapFunc(subDir) : [])),
        catchError((subDirStatError) => [
          PluginDiscoveryError.invalidPluginPath(subDir, subDirStatError),
        ])
      )
    )
  );
}
