/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as recast from 'recast';
const n = recast.types.namedTypes;
import fs from 'fs';
import path from 'path';
import { functions } from '../src/esql_documentation_sections';

(function () {
  const functionDocs = loadFunctionDocs();
  writeFunctionDocs(functionDocs);
})();

function loadFunctionDocs() {
  // read the markdown files from  /Users/andrewtate/workspace/elastic/kibana/blue/elasticsearch/docs/reference/esql/functions/kibana/docs
  // create a map of function name to markdown content where the function name is the name of the markdown file

  // Define the directory path
  const dirPath =
    '/Users/andrewtate/workspace/elastic/kibana/blue/elasticsearch/docs/reference/esql/functions/kibana/docs';

  // Read the directory
  const files = fs.readdirSync(dirPath);

  // Initialize an empty map
  const functionMap = new Map<string, string>();

  // Iterate over each file in the directory
  for (const file of files) {
    // Ensure we only process .md files
    if (path.extname(file) === '.md') {
      // Read the file content
      const content = fs.readFileSync(path.join(dirPath, file), 'utf-8');

      // Get the function name from the file name by removing the .md extension
      const functionName = path.basename(file, '.md');

      // Add the function name and content to the map
      functionMap.set(functionName, content);
    }
  }

  return functionMap;
}

function writeFunctionDocs(functionDocs: Map<string, string>) {
  const codeStrings = Array.from(functionDocs.entries()).map(
    ([name, doc]) => `
  const foo = {
    label: i18n.translate(
      'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.absFunction',
      {
        defaultMessage: '${name.toUpperCase()}',
      }
    ),
    description: (
      <Markdown
        readOnly
        markdownContent={i18n.translate(
          'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.${name}.markdown',
          {
            defaultMessage: \`${doc.replaceAll('`', '\\`')}\`,
            description:
              'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
          }
        )}
      />
    ),
  };`
  );

  const parseTypescript = (code: string) =>
    // recast.parse(code, { parser: require('recast/parsers/typescript') });
    recast.parse(code);

  const ast = parseTypescript(
    fs.readFileSync(path.join(__dirname, '../src/esql_documentation_sections.tsx'), 'utf-8')
  );

  const functionsList = findFunctionsList(ast);

  functionsList.elements = codeStrings.map(
    (codeString) => parseTypescript(codeString).program.body[0].declarations[0].init
  );

  const newFileContents = recast.print(ast);

  fs.writeFileSync(
    path.join(__dirname, '../src/esql_documentation_sections.tsx'),
    newFileContents.code
  );
}

/**
 * This function searches the AST for the describe block containing per-function tests
 * @param ast
 * @returns
 */
function findFunctionsList(ast: any): recast.types.namedTypes.ArrayExpression {
  let foundArray: recast.types.namedTypes.ArrayExpression | null = null;

  const functionsArrayIdentifier = Object.keys({ functions })[0];

  recast.visit(ast, {
    visitVariableDeclarator(astPath) {
      if (
        n.Identifier.check(astPath.node.id) &&
        astPath.node.id.name === functionsArrayIdentifier
      ) {
        this.traverse(astPath);
      }
      return false;
    },
    visitProperty(astPath) {
      if (
        n.Identifier.check(astPath.node.key) &&
        astPath.node.key.name === 'items' &&
        n.ArrayExpression.check(astPath.node.value)
      ) {
        foundArray = astPath.node.value;
        this.abort();
      }
      return false;
    },
  });

  if (!foundArray) {
    throw new Error('Could not find the functions array in the AST');
  }

  return foundArray;
}
