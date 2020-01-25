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

import webpack from 'webpack';
import isPathInside from 'is-path-inside';

import { BundleDefinition } from '../common';

const ANY_LEGACY_DIR = `${Path.sep}legacy${Path.sep}`;

interface ResolveData {
  /** compilation context */
  context: string;
  /** full request (with loaders) */
  request: string;
  dependencies: [
    {
      module: unknown;
      weak: boolean;
      optional: boolean;
      loc: unknown;
      request: string;
      userRequest: string;
    }
  ];
  /** absolute path, but probably includes loaders in some cases */
  userRequest: string;
  /** string from source code */
  rawRequest: string;
  loaders: unknown;
  /** absolute path to file, but probablt includes loaders in some cases */
  resource: string;
  /** module type */
  type: string | 'javascript/auto';

  resourceResolveData: {
    context: {
      /** absolute path to the file that issued the request */
      issuer: string;
    };
    /** absolute path to the resolved file */
    path: string;
  };
}

export class BlockLegacyCodePlugin {
  constructor(private readonly def: BundleDefinition) {}

  apply(compiler: webpack.Compiler) {
    compiler.hooks.normalModuleFactory.tap(BlockLegacyCodePlugin.name, normalModuleFactory => {
      normalModuleFactory.hooks.afterResolve.tap(
        BlockLegacyCodePlugin.name,
        (resolveData: ResolveData) => {
          const {
            rawRequest,
            resourceResolveData: { context, path },
          } = resolveData;

          if (path.includes(ANY_LEGACY_DIR) && !isPathInside(path, resolveData.context)) {
            const issuerRelative = Path.relative(this.def.sourceRoot, context.issuer);
            const resolveRelative = Path.relative(this.def.sourceRoot, path);
            // eslint-disable-next-line no-console
            console.error(
              `[${this.def.id}] is importing from legacy code:\nrequest: ${rawRequest}\nfrom: ${issuerRelative}\nresolved to: ${resolveRelative}`
            );
          }
        }
      );
    });
  }
}
