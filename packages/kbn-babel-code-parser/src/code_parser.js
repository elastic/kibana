/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { canRequire } from './can_require';
import { readFile, readFileSync } from 'fs';
import { extname } from 'path';
import { promisify } from 'util';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as babelParserOptions from '@kbn/babel-preset/common_babel_parser_options';

const read = promisify(readFile);

function _cannotParseFile(filePath) {
  return extname(filePath) !== '.js';
}

function _parseAndTraverseFileContent(fileContent, visitorsGenerator) {
  const results = [];

  // Parse and get the code AST
  // All the babel parser plugins
  // were enabled
  const ast = parser.parse(fileContent, babelParserOptions);

  // Loop through the code AST with
  // the defined visitors
  traverse(ast, visitorsGenerator(results));

  return results;
}

export async function parseSingleFile(filePath, visitorsGenerator) {
  // Don't parse any other files than .js ones
  if (_cannotParseFile(filePath)) {
    return [];
  }

  // Read the file
  const content = await read(filePath, { encoding: 'utf8' });

  // return the results found on parse and traverse
  // the file content with the given visitors
  return _parseAndTraverseFileContent(content, visitorsGenerator);
}

export function parseSingleFileSync(filePath, visitorsGenerator) {
  // Don't parse any other files than .js ones
  if (_cannotParseFile(filePath)) {
    return [];
  }

  // Read the file
  const content = readFileSync(filePath, { encoding: 'utf8' });

  // return the results found on parse and traverse
  // the file content with the given visitors
  return _parseAndTraverseFileContent(content, visitorsGenerator);
}

export async function parseEntries(cwd, entries, strategy, results, wasParsed = {}) {
  // Assure that we always have a cwd
  const sanitizedCwd = cwd || process.cwd();

  // Test each entry against canRequire function
  const entriesQueue = entries.map((entry) => canRequire(sanitizedCwd, entry));

  while (entriesQueue.length) {
    // Get the first element in the queue as
    // select it as our current entry to parse
    const mainEntry = entriesQueue.shift();

    // Avoid parse the current entry if it is not valid
    // or it was already parsed
    if (typeof mainEntry !== 'string' || wasParsed[mainEntry]) {
      continue;
    }

    // Find new entries and adds them to the end of the queue
    entriesQueue.push(
      ...(await strategy(sanitizedCwd, parseSingleFile, mainEntry, wasParsed, results))
    );

    // Mark the current main entry as already parsed
    wasParsed[mainEntry] = true;
  }

  return results;
}
