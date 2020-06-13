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

// @ts-ignore not typed by @types/webpack
import Module from 'webpack/lib/Module';

export class BundleRefModule extends Module {
  public built = false;
  public buildMeta?: any;
  public buildInfo?: any;
  public exportsArgument = '__webpack_exports__';

  constructor(public readonly exportId: string) {
    super('kbn/bundleRef', null);
  }

  libIdent() {
    return this.exportId;
  }

  chunkCondition(chunk: any) {
    return chunk.hasEntryModule();
  }

  identifier() {
    return '@kbn/bundleRef ' + JSON.stringify(this.exportId);
  }

  readableIdentifier() {
    return this.identifier();
  }

  needRebuild() {
    return false;
  }

  build(_: any, __: any, ___: any, ____: any, callback: () => void) {
    this.built = true;
    this.buildMeta = {};
    this.buildInfo = {};
    callback();
  }

  source() {
    return `
      __webpack_require__.r(__webpack_exports__);
      var ns = __kbnBundles__.get('${this.exportId}');
      Object.defineProperties(__webpack_exports__, Object.getOwnPropertyDescriptors(ns))
    `;
  }

  size() {
    return 42;
  }

  updateHash(hash: any) {
    hash.update(this.identifier());
    super.updateHash(hash);
  }
}
