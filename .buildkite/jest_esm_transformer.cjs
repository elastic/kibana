/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const ts = require('typescript');

// Transpiles ESM-only dependencies to CommonJS for Jest. ts-jest can't: TypeScript always emits
// ESM for `.mjs` files and leaves `import.meta.url`, which is a syntax error in CommonJS.
module.exports = {
  process(sourceText, sourcePath) {
    const { outputText } = ts.transpileModule(
      sourceText.replace(
        /\bimport\.meta\.url\b/g,
        "require('node:url').pathToFileURL(__filename).href"
      ),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
        },
        fileName: sourcePath.replace(/\.mjs$/, '.js'),
      }
    );
    return { code: outputText };
  },
};
