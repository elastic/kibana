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
const { readdirSync, readFileSync, writeFileSync } = require('fs');
const minimist = require('minimist');
const semver = require('semver');
const ora = require('ora');
const rimraf = require('rimraf');
const { cloneAndCheckout, createAutocompleteDefinitions } = require('./utils');
const { licenseHeader, supportedContexts } = require('./constants');

start(
  minimist(process.argv.slice(2), {
    string: ['tag', 'branch'],
  })
);

function start(opts) {
  const log = ora('Loading Elasticsearch repository').start();

  if (opts.branch == null && semver.valid(opts.tag) === null) {
    log.fail(`Missing or invalid tag: ${opts.tag}`);
    return;
  }

  const autocompleteOutputFolder = join(
    __dirname,
    '..',
    'src',
    'painless',
    'autocomplete_definitions'
  );

  log.text = 'Cleaning autocomplete definitions folder';
  rimraf.sync(join(autocompleteOutputFolder, '*.ts'));

  cloneAndCheckout({ tag: opts.tag, branch: opts.branch }, (err, { generatedFolder }) => {
    if (err) {
      log.fail(err.message);
      return;
    }

    const generatedFolderContents = readdirSync(generatedFolder);

    generatedFolderContents
      .filter((file) => {
        const contextName = file.split('.')[0].split('whitelist-').pop();
        return supportedContexts.includes(contextName);
      })
      .forEach((file) => {
        try {
          const { name, classes: painlessClasses } = JSON.parse(
            readFileSync(join(generatedFolder, file), 'utf8')
          );
          const filePath = join(autocompleteOutputFolder, `${name}.ts`);
          const code = createAutocompleteDefinitions(name, painlessClasses);
          writeFileSync(filePath, code, { encoding: 'utf8' });
        } catch (err) {
          log.fail(err.message);
        }
      });

    // Create index.js file for autocomplete definitions
    const exports = supportedContexts.reduce((exportList, context) => {
      const newExport = `
export { ${context} } from './${context}';`;
      exportList = `${newExport}${exportList}`;
      return exportList;
    }, '');

    const indexFilePath = join(autocompleteOutputFolder, 'index.ts');
    const indexCode = `${licenseHeader}${exports}
`;

    writeFileSync(indexFilePath, indexCode, { encoding: 'utf8' });

    log.succeed('Painless autocomplete definitions generated successfully');
  });
}
