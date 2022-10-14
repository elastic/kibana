/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import ts from 'typescript';

const fileName = './scripts/test.tsx';

function report(node: ts.Node, message: string) {
  const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line;
  const character = sourceFile.getLineAndCharacterOfPosition(node.getStart()).character;

  console.log(`(${line + 1},${character + 1}): ${message} ${node.getText()}`);
  console.log('POEPIE', node.getStart());
  // console.log('yo', node.getChildren());
}

function checkFile(sourceFile: ts.SourceFile) {
  checkNode(sourceFile);

  function checkNode(node: ts.Node) {
    switch (node.kind) {
      case ts.SyntaxKind.JsxOpeningElement:
        report(node, 'The following JSX statement was found:');
    }
    ts.forEachChild(node, checkNode);
  }
}

const sourceFile = ts.createSourceFile(
  fileName,
  fs.readFileSync(fileName).toString(),
  ts.ScriptTarget.ES2022,
  true
);

checkFile(sourceFile);
