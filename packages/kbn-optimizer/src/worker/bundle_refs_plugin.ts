/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Path from 'path';
import Fs from 'fs';

import webpack from 'webpack';

import { Bundle, BundleRefs, BundleRef } from '../common';
import { BundleRefModule } from './bundle_ref_module';

const RESOLVE_EXTENSIONS = ['.js', '.ts', '.tsx'];

function safeStat(path: string): Promise<Fs.Stats | undefined> {
  return new Promise((resolve, reject) => {
    Fs.stat(path, (error, stat) => {
      if (error?.code === 'ENOENT') {
        resolve(undefined);
      } else if (error) {
        reject(error);
      } else {
        resolve(stat);
      }
    });
  });
}

interface RequestData {
  context: string;
  dependencies: Array<{ request: string }>;
}

type Callback<T> = (error?: any, result?: T) => void;
type ModuleFactory = (data: RequestData, callback: Callback<BundleRefModule>) => void;

/**
 * Isolate the weired type juggling we have to do to add a hook to the webpack compiler
 */
function hookIntoCompiler(
  compiler: webpack.Compiler,
  handler: (context: string, request: string) => Promise<BundleRefModule | undefined>
) {
  compiler.hooks.compile.tap('BundleRefsPlugin', (compilationParams: any) => {
    compilationParams.normalModuleFactory.hooks.factory.tap(
      'BundleRefsPlugin/normalModuleFactory/factory',
      (wrappedFactory: ModuleFactory): ModuleFactory => (data, callback) => {
        const context = data.context;
        const dep = data.dependencies[0];

        handler(context, dep.request).then(
          (result) => {
            if (!result) {
              wrappedFactory(data, callback);
            } else {
              callback(undefined, result);
            }
          },
          (error) => callback(error)
        );
      }
    );
  });
}

export class BundleRefsPlugin {
  private resolvedRequestCache = new Map<string, Promise<string | undefined>>();

  constructor(private readonly bundle: Bundle, public readonly bundleRefs: BundleRefs) {}

  apply(compiler: webpack.Compiler) {
    hookIntoCompiler(compiler, async (context, request) => {
      const exportId = await this.resolveExternal(context, request);
      if (exportId) {
        return new BundleRefModule(exportId);
      }
    });
  }

  private cachedResolveRequest(context: string, request: string) {
    const absoluteRequest = Path.resolve(context, request);
    const cached = this.resolvedRequestCache.get(absoluteRequest);

    if (cached) {
      return cached;
    }

    const promise = this.resolveRequest(absoluteRequest);
    this.resolvedRequestCache.set(absoluteRequest, promise);
    return promise;
  }

  private async resolveRequest(absoluteRequest: string) {
    const stats = await safeStat(absoluteRequest);
    if (stats && stats.isFile()) {
      return absoluteRequest;
    }

    if (stats?.isDirectory()) {
      for (const ext of RESOLVE_EXTENSIONS) {
        const indexPath = Path.resolve(absoluteRequest, `index${ext}`);
        const indexStats = await safeStat(indexPath);
        if (indexStats?.isFile()) {
          return indexPath;
        }
      }
    }

    return;
  }

  /**
   * Determine externals statements for require/import statements by looking
   * for requests resolving to the primary public export of the data, kibanaReact,
   * amd kibanaUtils plugins. If this module is being imported then rewrite
   * the import to access the global `__kbnBundles__` variables and access
   * the relavent properties from that global object.
   *
   * @param bundle
   * @param context the directory containing the module which made `request`
   * @param request the request for a module from a commonjs require() call or import statement
   */
  async resolveExternal(context: string, request: string) {
    // ignore imports that have loaders defined or are not relative seeming
    if (request.includes('!') || !request.startsWith('.')) {
      return;
    }

    const requestExt = Path.extname(request);
    if (requestExt && !RESOLVE_EXTENSIONS.includes(requestExt)) {
      return;
    }

    const resolved = await this.cachedResolveRequest(context, request);
    if (!resolved) {
      return;
    }

    const eligibleRefs = this.bundleRefs.filterByContextPrefix(this.bundle, resolved);
    if (!eligibleRefs.length) {
      // import doesn't match a bundle context
      return;
    }

    let matchingRef: BundleRef | undefined;
    for (const ref of eligibleRefs) {
      const resolvedEntry = await this.cachedResolveRequest(ref.contextDir, ref.entry);
      if (resolved === resolvedEntry) {
        matchingRef = ref;
      }
    }

    if (!matchingRef) {
      const bundleId = Array.from(new Set(eligibleRefs.map((r) => r.id))).join(', ');
      const publicDir = eligibleRefs.map((r) => r.entry).join(', ');
      throw new Error(
        `import [${request}] references a non-public export of the [${bundleId}] bundle and must point to one of the public directories: [${publicDir}]`
      );
    }

    return matchingRef.exportId;
  }
}
