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

/* @notice
 * This product uses tslint-rules-bunch which is available under a
 * "MIT" license.
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2017-present, Vladimir Yakovlev
 * https://github.com/vladimiry/tslint-rules-bunch
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

const path = require('path');
const Lint = require('tslint');
const mm = require('micromatch');
const { findImports, ImportKind } = require('tsutils');

const metadata = {
  ruleName: 'no-import-zones',
  description: `Forbids specific imports for the specified targets using 'micromatch' patterns matching`,
  optionsDescription: Lint.Utils.dedent`
      * 'basePath': by default 'process.cwd()' is used as the base path, but custom 'basePath'
      property can be specified on the both zone/top and specific item levels. If values are specified on the
      both levels, then specific item's value takes the priority.
      * 'patterns' object specifies:
          * 'target': file name pattern to which forbidding rule will be applied
          * 'from': file import pattern that will be from for the specified 'target'
      * 'verbose': verbose output
  `,
  options: {
    type: 'object',
    required: ['zones'],
    additionalProperties: false,
    properties: {
      basePath: { type: ['string', 'null'] },
      zones: {
        type: 'array',
        items: {
          type: 'object',
          required: ['patterns'],
          additionalProperties: false,
          properties: {
            basePath: { type: ['string', 'null'] },
            patterns: {
              type: 'array',
              items: {
                type: 'object',
                required: ['target', 'from'],
                additionalProperties: false,
                properties: {
                  target: {
                    anyOf: [
                      { type: 'string' },
                      { type: 'array', items: { type: 'string' } },
                    ],
                  },
                  from: {
                    anyOf: [
                      { type: 'string' },
                      { type: 'array', items: { type: 'string' } },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  optionExamples: [
    true,
    [
      {
        basePath: 'src',
        zones: [
          {
            patterns: [
              {
                target: 'test/**/*',
                from: 'lib/**/*',
              },
            ],
          },
        ],
      },
    ],
  ],
  type: 'functionality',
  typescriptOnly: false,
};

class Rule extends Lint.Rules.AbstractRule {
  isEnabled() {
    return super.isEnabled() && this.ruleArguments.length > 0;
  }

  apply(sourceFile) {
    return this.applyWithFunction(sourceFile, walk, this.ruleArguments);
  }
}

Rule.metadata = metadata;

function walk(ctx) {
  for (const importUnit of findImports(ctx.sourceFile, ImportKind.All)) {
    for (const { basePath: topLevelBasePath, zones, verbose } of ctx.options) {
      for (const { basePath: zoneBasePath, patterns } of zones) {
        // eslint-disable-next-line no-nested-ternary
        const basePath = zoneBasePath
          ? resolveBasePath(zoneBasePath)
          : topLevelBasePath
            ? resolveBasePath(topLevelBasePath)
            : path.resolve(process.cwd());

        const srcFile = path.resolve(path.resolve(ctx.sourceFile.fileName));
        const srcFileDir = path.parse(srcFile).dir;

        const importFile = importUnit.text.startsWith('.')
          ? path.resolve(srcFileDir, importUnit.text)
          : importUnit.text;

        const relativeSrcFile = path.relative(basePath, srcFile);
        const relativeImportFile = path.relative(basePath, importFile);
        for (const { target, from } of patterns) {
          if (mm([relativeSrcFile], target).length && mm([relativeImportFile], from).length) {
            const zone = { basePath, target, from };
            const messages = [
              `(${Rule.metadata.ruleName}): '${importUnit.text}' import is forbidden`,
            ];

            if (verbose) {
              messages.push(...[
                `; rule: ${JSON.stringify(zone)}; resolved values: ${JSON.stringify({
                  file: relativeSrcFile,
                  import: relativeImportFile,
                })}`,
              ]);
            }

            ctx.addFailure(importUnit.getStart(ctx.sourceFile) + 1, importUnit.end - 1, messages.join(''));
          }
        }
      }
    }
  }
}

function resolveBasePath(basePath) {
  return path.isAbsolute(basePath)
    ? basePath
    : path.relative(process.cwd(), basePath);
}

exports.Rule = Rule;
