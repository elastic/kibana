/* eslint-disable @kbn/eslint/require-license-header */

/**
 * @notice
 *
 * This module was heavily inspired by the externals plugin that ships with webpack@97d58d31
 * MIT License http://www.opensource.org/licenses/mit-license.php
 * Author Tobias Koppers @sokra
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
  private readonly resolvedRefEntryCache = new Map<BundleRef, Promise<string>>();
  private readonly resolvedRequestCache = new Map<string, Promise<string | undefined>>();
  private readonly ignorePrefix = Path.resolve(this.bundle.contextDir) + Path.sep;

  constructor(private readonly bundle: Bundle, private readonly bundleRefs: BundleRefs) {}

  apply(compiler: webpack.Compiler) {
    hookIntoCompiler(compiler, async (context, request) => {
      const ref = await this.resolveRef(context, request);
      if (ref) {
        return new BundleRefModule(ref.exportId);
      }
    });
  }

  private cachedResolveRefEntry(ref: BundleRef) {
    const cached = this.resolvedRefEntryCache.get(ref);

    if (cached) {
      return cached;
    }

    const absoluteRequest = Path.resolve(ref.contextDir, ref.entry);
    const promise = this.cachedResolveRequest(absoluteRequest).then((resolved) => {
      if (!resolved) {
        throw new Error(`Unable to resolve request [${ref.entry}] relative to [${ref.contextDir}]`);
      }

      return resolved;
    });
    this.resolvedRefEntryCache.set(ref, promise);
    return promise;
  }

  private cachedResolveRequest(absoluteRequest: string) {
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

    // look for an index file in directories
    if (stats?.isDirectory()) {
      for (const ext of RESOLVE_EXTENSIONS) {
        const indexPath = Path.resolve(absoluteRequest, `index${ext}`);
        const indexStats = await safeStat(indexPath);
        if (indexStats?.isFile()) {
          return indexPath;
        }
      }
    }

    // look for a file with one of the supported extensions
    for (const ext of RESOLVE_EXTENSIONS) {
      const filePath = `${absoluteRequest}${ext}`;
      const fileStats = await safeStat(filePath);
      if (fileStats?.isFile()) {
        return filePath;
      }
    }

    return;
  }

  /**
   * Determine if an import request resolves to a bundleRef export id. If the
   * request resolves to a bundle ref context but none of the exported directories
   * then an error is thrown. If the request does not resolve to a bundleRef then
   * undefined is returned. Otherwise it returns the referenced bundleRef.
   */
  private async resolveRef(context: string, request: string) {
    // ignore imports that have loaders defined or are not relative seeming
    if (request.includes('!') || !request.startsWith('.')) {
      return;
    }

    const requestExt = Path.extname(request);
    if (requestExt && !RESOLVE_EXTENSIONS.includes(requestExt)) {
      return;
    }

    const absoluteRequest = Path.resolve(context, request);
    if (absoluteRequest.startsWith(this.ignorePrefix)) {
      return;
    }

    const resolved = await this.cachedResolveRequest(absoluteRequest);
    if (!resolved) {
      return;
    }

    const eligibleRefs = this.bundleRefs.filterByContextPrefix(this.bundle, resolved);
    if (!eligibleRefs.length) {
      // import doesn't match a bundle context
      return;
    }

    for (const ref of eligibleRefs) {
      const resolvedEntry = await this.cachedResolveRefEntry(ref);
      if (resolved === resolvedEntry) {
        return ref;
      }
    }

    const bundleId = Array.from(new Set(eligibleRefs.map((r) => r.bundleId))).join(', ');
    const publicDir = eligibleRefs.map((r) => r.entry).join(', ');
    throw new Error(
      `import [${request}] references a non-public export of the [${bundleId}] bundle and must point to one of the public directories: [${publicDir}]`
    );
  }
}
