/* eslint-disable @kbn/eslint/require-license-header */

/**
 * @notice
 *
 * This module was heavily inspired by the externals plugin that ships with webpack@97d58d31
 * MIT License http://www.opensource.org/licenses/mit-license.php
 * Author Tobias Koppers @sokra
 */

import webpack from 'webpack';

import { parseKbnImportReq } from '@kbn/repo-packages';

import { Bundle, BundleRemotes } from '../common';
import { BundleRemoteModule } from './bundle_remote_module';

interface RequestData {
  context: string;
  dependencies: Array<{ request: string }>;
}

type Callback<T> = (error?: any, result?: T) => void;

export class BundleRemotesPlugin {
  private allowedBundleIds = new Set<string>();

  constructor(private readonly bundle: Bundle, private readonly remotes: BundleRemotes) {}

  /**
   * Called by webpack when the plugin is passed in the webpack config
   */
  public apply(compiler: webpack.Compiler) {
    // called whenever the compiler starts to compile, passed the params
    // that will be used to create the compilation
    compiler.hooks.compile.tap('BundleRemotesPlugin', (compilationParams: any) => {
      const moduleCache = new Map<string, BundleRemoteModule | null>();

      // hook into the creation of NormalModule instances in webpack, if the import
      // statement leading to the creation of the module is pointing to a bundleRef
      // entry then create a BundleRefModule instead of a NormalModule.
      compilationParams.normalModuleFactory.hooks.factorize.tapAsync(
        'BundleRefsPlugin/normalModuleFactory/factorize',
        (data: RequestData, callback: Callback<BundleRemoteModule>) => {
          const { request } = data.dependencies[0];

          const cached = moduleCache.get(request);
          if (cached === null) {
            return callback();
          }
          if (cached !== undefined) {
            return callback(null, cached);
          }

          this.resolve(request, (error, result) => {
            if (error || result === undefined) {
              return callback(error);
            }

            moduleCache.set(request, result);

            if (result === null) {
              return callback();
            }

            callback(null, result);
          });
        }
      );
    });

    compiler.hooks.compilation.tap('BundleRefsPlugin/populateAllowedBundleIds', (compilation) => {
      const manifestPath = this.bundle.manifestPath;
      if (!manifestPath) {
        return;
      }

      const deps = this.bundle.readBundleDeps();
      this.allowedBundleIds = new Set([...deps.explicit, ...deps.implicit]);

      compilation.hooks.additionalAssets.tap('BundleRefsPlugin/watchManifest', () => {
        compilation.fileDependencies.add(manifestPath);
      });

      compilation.hooks.finishModules.tapPromise(
        'BundleRefsPlugin/finishModules',
        async (modules) => {
          const usedBundleIds = (Array.from(modules) as any[])
            .filter((m: any): m is BundleRemoteModule => m instanceof BundleRemoteModule)
            .map((m) => m.remote.bundleId);

          const unusedBundleIds = deps.explicit
            .filter((id) => !usedBundleIds.includes(id))
            .join(', ');

          if (unusedBundleIds) {
            const error = new webpack.WebpackError(
              `Bundle for [${this.bundle.id}] lists [${unusedBundleIds}] as a required bundle, but does not use it. Please remove it.`
            );
            (error as any).file = manifestPath;
            compilation.errors.push(error);
          }
        }
      );
    });
  }

  public resolve(request: string, cb: (error?: Error, bundle?: null | BundleRemoteModule) => void) {
    // NOTE: previously on webpack v4 ?raw files did not reach this phase and were excluded
    // which is not the case anymore in webpack v5 so we need to do exclude them from being resolved
    if (request.endsWith('.json') || request.endsWith('?raw')) {
      return cb(undefined, null);
    }

    const parsed = parseKbnImportReq(request);
    if (!parsed) {
      return cb(undefined, null);
    }

    const remote = this.remotes.getForPkgId(parsed.pkgId);
    if (!remote) {
      return cb(undefined, null);
    }

    if (!remote.targets.includes(parsed.target)) {
      return cb(
        new Error(
          `import [${request}] references a non-public export of the [${remote.bundleId}] bundle and must point to one of the public directories: [${remote.targets}]`
        )
      );
    }

    if (!this.allowedBundleIds.has(remote.bundleId)) {
      return cb(
        new Error(
          `import [${request}] references a public export of the [${remote.bundleId}] bundle, but that bundle is not in the "requiredPlugins" or "requiredBundles" list in the plugin manifest [${this.bundle.manifestPath}]`
        )
      );
    }

    return cb(undefined, new BundleRemoteModule(remote, parsed));
  }
}
