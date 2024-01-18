/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ts from 'typescript';
import { readdirSync, statSync } from 'fs';

function findImports(filePath: string, targetFile: string): string[] {
  const program = ts.createProgram([filePath], {});
  const sourceFile = program.getSourceFile(filePath);

  if (!sourceFile) {
    process.exit(1);
  }

  const imports: string[] = [];

  function visit(node: ts.Node) {
    if (
      ts.isImportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text === targetFile
    ) {
      imports.push(node.moduleSpecifier.text);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return imports;
}

export function findImportingFiles({
  directory,
  targetFile,
  depth = 2,
}: {
  directory: string;
  targetFile: string;
  depth?: number;
}): string[] {
  const files = readdirSync(directory);
  const importingFiles: string[] = [];

  for (const file of files) {
    if (depth === 0) return importingFiles;

    const path = `${directory}/${file}`;
    const stats = statSync(path);

    if (stats.isDirectory() && !path.includes('node_modules')) {
      importingFiles.push(...findImportingFiles({ directory: path, targetFile, depth: depth - 1 }));
    } else if (stats.isFile() && file.endsWith('.ts')) {
      const imports = findImports(path, targetFile);
      if (imports.includes(targetFile)) {
        importingFiles.push(path);
      }
    }
  }

  return importingFiles;
}
