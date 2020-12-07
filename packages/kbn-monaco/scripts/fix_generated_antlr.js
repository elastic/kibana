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

const { join } = require('path');
const { readdirSync, readFileSync, writeFileSync, renameSync } = require('fs');
const ora = require('ora');

const generatedAntlrFolder = join(__dirname, '..', 'src', 'painless', 'antlr');

const generatedAntlrFolderContents = readdirSync(generatedAntlrFolder);

const log = ora('Updating generated antlr grammar').start();

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

      fileContentRows.unshift('// @ts-nocheck');

      const filePath = join(generatedAntlrFolder, file);
      const fileContent = fileContentRows.join('\n');

      writeFileSync(filePath, fileContent, { encoding: 'utf8' });
    } catch (err) {
      return log.fail(err.message);
    }
  });

// Rename generated parserListener file to snakecase to satisfy file casing check
// There doesn't appear to be a way to fix this OOTB with antlr4ts-cli
try {
  renameSync(
    join(generatedAntlrFolder, 'painless_parserListener.ts'),
    join(generatedAntlrFolder, 'painless_parser_listener.ts')
  );
} catch (err) {
  log.warn(`Unable to rename parserListener file to snakecase: ${err.message}`);
}

log.succeed('Updated generated antlr grammar successfully');
