/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as recast from 'recast';
import fs from 'fs';
import path from 'path';

function main() {
  const functionDocs = loadFunctionDocs();
  writeFunctionDocs(functionDocs);
}

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
  {
    label: i18n.translate(
      'textBasedEditor.query.textBasedLanguagesEditor.documentationESQL.absFunction',
      {
        defaultMessage: '${name}',
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
  },`
  );

  console.log(codeStrings[0]);
}

main();
