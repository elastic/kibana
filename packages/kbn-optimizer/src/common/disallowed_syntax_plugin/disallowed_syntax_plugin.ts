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

import webpack from 'webpack';
import acorn from 'acorn';
import * as AcornWalk from 'acorn-walk';

import { checksByNodeType, DisallowedSyntaxCheck } from './disallowed_syntax';
import { parseFilePath } from '../parse_path';

export class DisallowedSyntaxPlugin {
  apply(compiler: webpack.Compiler) {
    compiler.hooks.normalModuleFactory.tap(DisallowedSyntaxPlugin.name, (factory) => {
      factory.hooks.parser.for('javascript/auto').tap(DisallowedSyntaxPlugin.name, (parser) => {
        parser.hooks.program.tap(DisallowedSyntaxPlugin.name, (program: acorn.Node) => {
          const module = parser.state?.current;
          if (!module || !module.resource) {
            return;
          }

          const resource: string = module.resource;
          const { dirs } = parseFilePath(resource);

          if (!dirs.includes('node_modules')) {
            return;
          }

          const failedChecks = new Set<DisallowedSyntaxCheck>();

          AcornWalk.full(program, (node) => {
            const checks = checksByNodeType.get(node.type as any);
            if (!checks) {
              return;
            }

            for (const check of checks) {
              if (!check.test || check.test(node)) {
                failedChecks.add(check);
              }
            }
          });

          if (!failedChecks.size) {
            return;
          }

          // throw an error to trigger a parse failure, causing this module to be reported as invalid
          throw new Error(
            `disallowed syntax found in file ${resource}:\n  - ${Array.from(failedChecks)
              .map((c) => c.name)
              .join('\n  - ')}`
          );
        });
      });
    });
  }
}
