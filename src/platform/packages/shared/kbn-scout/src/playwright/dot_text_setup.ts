/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Initialize require hook for .text files.
 * This is required for packages like @kbn/evals that import .text files
 * (e.g. LLM prompt templates) via `import text from './file.text'`.
 *
 * Without this, Playwright worker processes crash with:
 *   SyntaxError: Unexpected identifier 'are'
 * because Node tries to parse the raw text content as JavaScript.
 *
 * The hook converts .text file contents into `module.exports = "<escaped content>"`.
 */
import Fs from 'fs';

if (!require.extensions['.text']) {
  const cache = new Map<string, string>();

  require.extensions['.text'] = function (module: NodeModule, filename: string) {
    let compiled = cache.get(filename);
    if (!compiled) {
      const content = Fs.readFileSync(filename, 'utf8');
      compiled = `module.exports = ${JSON.stringify(content)};\n`;
      cache.set(filename, compiled);
    }
    // @ts-expect-error _compile is an internal Node.js API
    module._compile(compiled, filename);
  };
}
