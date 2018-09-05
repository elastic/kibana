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

import { IS_KIBANA_DISTRIBUTABLE } from '../../utils';

export class EsmExportsPlugin {
  apply(compiler) {
    this.registerCompilationHook(compiler);
  }

  registerCompilationHook(compiler) {
    if (!IS_KIBANA_DISTRIBUTABLE) {
      // Used to override the configurations for the esm exports.
      // It's very useful to be able to mutate an esm module while
      // testing in order to make the sinon stub capabilities working.
      // This problem were introduced on webpack 4 since it exports
      // everything on esm modules with the Object.defineProperty and
      // the configurable: false, so files that exports
      // default function not enclosed in class modules will
      // be impacted by this problem.
      //
      // More info about this subject can be found on:
      // https://github.com/webpack/webpack/issues/6979
      // https://github.com/webpack/webpack/pull/7132
      compiler.hooks.compilation.tap('EsmExportsPlugin', (compilation) => {
        compilation.mainTemplate.hooks.requireExtensions.tap('EsmExportsPlugin', (source) =>
          source.replace(
            'Object.defineProperty(exports, name, { enumerable: true, get: getter });',
            'Object.defineProperty(exports, name, { configurable: true, enumerable: true, get: getter });'
          )
        );
      });
    }
  }
}
