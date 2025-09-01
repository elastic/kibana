/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const path = require('path');
const fs = require('fs');
const typescript = require('typescript');

/**
 * Custom webpack plugin to compile TypeScript files and copy JSON files
 * while preserving the original folder structure.
 *
 * This plugin processes the console_definitions folder and:
 * - Compiles .ts files to .js files
 * - Copies .json files as-is
 * - Maintains the exact directory structure
 */
class ConsoleDefinitionsPlugin {
  constructor(options) {
    this.sourceDir = options.from;
    this.targetDir = options.to;
  }

  apply(compiler) {
    compiler.hooks.emit.tapAsync('ConsoleDefinitionsPlugin', (compilation, callback) => {
      try {
        this.processDirectory(this.sourceDir, this.targetDir);
        callback();
      } catch (error) {
        callback(error);
      }
    });
  }

  processDirectory(sourceDir, targetDir) {
    if (!fs.existsSync(sourceDir)) {
      console.warn(`Source directory does not exist: ${sourceDir}`);
      return;
    }

    // Ensure target directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const items = fs.readdirSync(sourceDir);

    for (const item of items) {
      const sourcePath = path.join(sourceDir, item);
      const stat = fs.statSync(sourcePath);

      if (stat.isDirectory()) {
        // Recursively process subdirectories
        const targetSubDir = path.join(targetDir, item);
        this.processDirectory(sourcePath, targetSubDir);
      } else if (stat.isFile()) {
        if (item.endsWith('.ts')) {
          // Compile TypeScript file to JavaScript
          this.compileTypeScriptFile(sourcePath, targetDir, item);
        } else if (item.endsWith('.json')) {
          // Copy JSON files as-is
          const targetPath = path.join(targetDir, item);
          fs.copyFileSync(sourcePath, targetPath);
        }
        // Ignore other file types (e.g., .md, .txt, etc.)
      }
    }
  }

  compileTypeScriptFile(sourcePath, targetDir, fileName) {
    try {
      const sourceCode = fs.readFileSync(sourcePath, 'utf8');

      // TypeScript compiler options optimized for console definitions
      const compilerOptions = {
        target: typescript.ScriptTarget.ES2018,
        module: typescript.ModuleKind.CommonJS,
        moduleResolution: typescript.ModuleResolutionKind.NodeJs,
        allowJs: true,
        skipLibCheck: true,
        declaration: false,
        esModuleInterop: true,
        forceConsistentCasingInFileNames: true,
        strict: false,
        // Don't emit comments to keep output clean
        removeComments: false,
        // Preserve source maps for debugging if needed
        sourceMap: false,
      };

      // Compile TypeScript to JavaScript
      const result = typescript.transpileModule(sourceCode, {
        compilerOptions,
        fileName: sourcePath,
      });

      // Check for compilation errors
      if (result.diagnostics && result.diagnostics.length > 0) {
        console.warn(`TypeScript compilation warnings for ${sourcePath}:`);
        result.diagnostics.forEach((diagnostic) => {
          const message = typescript.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
          console.warn(`  ${message}`);
        });
      }

      // Write compiled JavaScript file
      const jsFileName = fileName.replace('.ts', '.js');
      const targetPath = path.join(targetDir, jsFileName);
      fs.writeFileSync(targetPath, result.outputText);

      // Log successful compilation in verbose mode
      if (process.env.WEBPACK_VERBOSE) {
        console.log(`Compiled: ${sourcePath} -> ${targetPath}`);
      }
    } catch (error) {
      console.error(`Error compiling TypeScript file ${sourcePath}:`, error.message);
      throw error; // Re-throw to fail the build if compilation fails
    }
  }
}

module.exports = ConsoleDefinitionsPlugin;
