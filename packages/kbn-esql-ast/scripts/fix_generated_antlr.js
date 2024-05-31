/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { join } = require('path');
const { readdirSync, readFileSync, writeFileSync, renameSync } = require('fs');
const ora = require('ora');
const log = ora('Updating generated antlr grammar').start();

function execute() {
  const generatedAntlrFolder = join(__dirname, '..', 'src', 'antlr');

  const generatedAntlrFolderContents = readdirSync(generatedAntlrFolder);

  // The generated TS produces some TS linting errors
  // This script adds a //@ts-nocheck comment at the top of each generated file
  // so that the errors can be ignored for now
  generatedAntlrFolderContents
    .filter((file) => {
      const fileExtension = file.split('.')[1];
      return fileExtension.includes('ts');
    })
    .forEach((file) => {
      try {
        const fileContentRows = readFileSync(join(generatedAntlrFolder, file), 'utf8')
          .toString()
          .split('\n');

        if (!/\@ts-nocheck/.test(fileContentRows[0])) {
          fileContentRows.unshift('// @ts-nocheck');
        }

        const filePath = join(generatedAntlrFolder, file);
        const fileContent = fileContentRows.join('\n');

        writeFileSync(filePath, fileContent, { encoding: 'utf8' });
      } catch (err) {
        return log.fail(err.message);
      }
    });

  // Rename generated parserListener file to snakecase to satisfy file casing check
  // There doesn't appear to be a way to fix this OOTB with antlr4
  try {
    renameSync(
      join(generatedAntlrFolder, `esql_parserListener.ts`),
      join(generatedAntlrFolder, `esql_parser_listener.ts`)
    );
  } catch (err) {
    log.warn(`Unable to rename parserListener file to snake-case: ${err.message}`);
  }

  log.succeed('Updated generated antlr grammar successfully');
}

execute();
