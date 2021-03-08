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

export class BundleRefsPlugin {
  private readonly resolvedRefEntryCache = new Map<BundleRef, Promise<string>>();
  private readonly resolvedRequestCache = new Map<string, Promise<string | undefined>>();
  private readonly ignorePrefix = Path.resolve(this.bundle.contextDir) + Path.sep;
  private allowedBundleIds = new Set<string>();

  constructor(private readonly bundle: Bundle, private readonly bundleRefs: BundleRefs) {}

  /**
   * Called by webpack when the plugin is passed in the webpack config
   */
  public apply(compiler: webpack.Compiler) {
    // called whenever the compiler starts to compile, passed the params
    // that will be used to create the compilation
    compiler.hooks.compile.tap('BundleRefsPlugin', (compilationParams: any) => {
      // clear caches because a new compilation is starting, meaning that files have
      // changed and we should re-run resolutions
      this.resolvedRefEntryCache.clear();
      this.resolvedRequestCache.clear();

      // hook into the creation of NormalModule instances in webpack, if the import
      // statement leading to the creation of the module is pointing to a bundleRef
      // entry then create a BundleRefModule instead of a NormalModule.
      compilationParams.normalModuleFactory.hooks.factory.tap(
        'BundleRefsPlugin/normalModuleFactory/factory',
        (wrappedFactory: ModuleFactory): ModuleFactory => (data, callback) => {
          const context = data.context;
          const dep = data.dependencies[0];

          this.maybeReplaceImport(context, dep.request).then(
            (module) => {
              if (!module) {
                wrappedFactory(data, callback);
              } else {
                callback(undefined, module);
              }
            },
            (error) => callback(error)
          );
        }
      );
    });

    compiler.hooks.compilation.tap('BundleRefsPlugin/getRequiredBundles', (compilation) => {
      this.allowedBundleIds.clear();

      const manifestPath = this.bundle.manifestPath;
      if (!manifestPath) {
        return;
      }

      const deps = this.bundle.readBundleDeps();
      for (const ref of this.bundleRefs.forBundleIds([...deps.explicit, ...deps.implicit])) {
        this.allowedBundleIds.add(ref.bundleId);
      }

      compilation.hooks.additionalAssets.tap('BundleRefsPlugin/watchManifest', () => {
        compilation.fileDependencies.add(manifestPath);
      });

      compilation.hooks.finishModules.tapPromise(
        'BundleRefsPlugin/finishModules',
        async (modules) => {
          const usedBundleIds = (modules as any[])
            .filter((m: any): m is BundleRefModule => m instanceof BundleRefModule)
            .map((m) => m.ref.bundleId);

          const unusedBundleIds = deps.explicit
            .filter((id) => !usedBundleIds.includes(id))
            .join(', ');

          if (unusedBundleIds) {
            const error = new Error(
              `Bundle for [${this.bundle.id}] lists [${unusedBundleIds}] as a required bundle, but does not use it. Please remove it.`
            );
            (error as any).file = manifestPath;
            compilation.errors.push(error);
          }
        }
      );
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
  private async maybeReplaceImport(context: string, request: string) {
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

    const possibleRefs = this.bundleRefs.filterByContextPrefix(this.bundle, resolved);
    if (!possibleRefs.length) {
      // import doesn't match a bundle context
      return;
    }

    for (const ref of possibleRefs) {
      const resolvedEntry = await this.cachedResolveRefEntry(ref);
      if (resolved !== resolvedEntry) {
        continue;
      }

      if (!this.allowedBundleIds.has(ref.bundleId)) {
        throw new Error(
          `import [${request}] references a public export of the [${ref.bundleId}] bundle, but that bundle is not in the "requiredPlugins" or "requiredBundles" list in the plugin manifest [${this.bundle.manifestPath}]`
        );
      }

      return new BundleRefModule(ref);
    }

    const bundleId = Array.from(new Set(possibleRefs.map((r) => r.bundleId))).join(', ');
    const publicDir = possibleRefs.map((r) => r.entry).join(', ');
    throw new Error(
      `import [${request}] references a non-public export of the [${bundleId}] bundle and must point to one of the public directories: [${publicDir}]`
    );
  }
}
