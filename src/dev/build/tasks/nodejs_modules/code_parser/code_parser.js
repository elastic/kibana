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

import { canRequire } from './can_require';
import { read } from '../../../lib';
import { extname } from 'path';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';

export async function _parseSingleFile(filePath, visitorsGenerator) {
  const results = [];

  // Don't parse any other files than .js ones
  if (extname(filePath) !== '.js') {
    return results;
  }

  // Read the file
  const content = await read(filePath, { encoding: 'utf8' });

  // Parse and get the code AST
  // All the babel parser plugins
  // were enabled
  const ast = parser.parse(content, {
    sourceType: 'unambiguous',
    plugins: [
      'asyncGenerators',
      'classProperties',
      'dynamicImport',
      'exportDefaultFrom',
      'exportNamespaceFrom',
      'objectRestSpread',
      'throwExpressions'
    ]
  });

  // Loop through the code AST with
  // the defined visitors
  traverse(ast, visitorsGenerator(results));

  return results;
}

export async function parseEntries(build, entries, strategy, results, wasParsed = {}) {
  // Test each entry against canRequire function
  const entriesQueue = entries.map(entry => canRequire(build, entry));

  while(entriesQueue.length) {
    // Get the first element in the queue as
    // select it as our current entry to parse
    const mainEntry = entriesQueue.shift();

    // Avoid parse the current entry if it is not valid
    // or it was already parsed
    if (typeof mainEntry !== 'string' || wasParsed[mainEntry]) {
      continue;
    }

    // Find new entries and adds them to the end of the queue
    entriesQueue.push(...(await strategy(build, _parseSingleFile, mainEntry, wasParsed, results)));

    // Mark the current main entry as already parsed
    wasParsed[mainEntry] = true;
  }

  return results;
}
