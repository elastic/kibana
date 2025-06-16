/* eslint-disable @kbn/eslint/require-license-header */

/**
 * @notice
 *
 * This module was heavily inspired by the externals plugin that ships with webpack@97d58d31
 * MIT License http://www.opensource.org/licenses/mit-license.php
 * Author Tobias Koppers @sokra
 */

import { KbnImportReq } from '@kbn/repo-packages';

// @ts-ignore not typed by @types/webpack
import Module from 'webpack/lib/Module';
import { RawSource } from 'webpack-sources';
import { BundleRemote } from '../common';

export class BundleRemoteModule extends Module {
  public built = false;
  public buildMeta?: any;
  public buildInfo?: any;

  constructor(public readonly remote: BundleRemote, public readonly req: KbnImportReq) {
    super('kbn/bundleRemote', null);
  }

  libIdent() {
    return this.req.full;
  }

  chunkCondition(chunk: any, { chunkGraph }: any) {
    return chunkGraph.getNumberOfEntryModules(chunk) > 0;
  }

  identifier() {
    return `@kbn/bundleRemote ${this.req.full}`;
  }

  readableIdentifier() {
    return this.identifier();
  }

  needBuild(context: any, callback: any) {
    return callback(null, !this.buildMeta);
  }

  build(_: any, __: any, ___: any, ____: any, callback: () => void) {
    this.buildMeta = {
      async: false,
      exportsType: undefined,
    };
    this.buildInfo = {
      strict: false,
      topLevelDeclarations: new Set(),
      module: __.outputOptions.module,
      exportsArgument: '__webpack_exports__',
    };

    // super.addDependency(new StaticExportsDependency(true, false));
    callback();
  }

  getConcatenationBailoutReason({ moduleGraph }: any) {
    return `@kbn/bundleRemote externals can't be concatenated`;
  }

  codeGeneration(_: any) {
    const sources = new Map();
    sources.set(
      'javascript',
      new RawSource(`
      __webpack_require__.r(__webpack_exports__);
      var ns = __kbnBundles__.get('${this.remote.bundleType}/${this.remote.bundleId}/${this.req.target}');
      Object.defineProperties(__webpack_exports__, Object.getOwnPropertyDescriptors(ns))
    `)
    );

    const data = new Map();
    data.set('url', this.req.full);

    return {
      sources,
      runtimeRequirements: new Set([
        'module',
        '__webpack_exports__',
        '__webpack_require__',
        // '__webpack_require__.r',
      ]),
      data,
    };
  }

  source() {
    return `
      __webpack_require__.r(__webpack_exports__);
      var ns = __kbnBundles__.get('${this.remote.bundleType}/${this.remote.bundleId}/${this.req.target}');
      Object.defineProperties(__webpack_exports__, Object.getOwnPropertyDescriptors(ns))
    `;
  }

  size() {
    return 42;
  }

  updateHash(hash: any, context: any) {
    hash.update(this.identifier());
    super.updateHash(hash, context);
  }
}
