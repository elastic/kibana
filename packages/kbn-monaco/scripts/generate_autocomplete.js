/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { join } = require('path');
const { readdirSync, readFileSync, writeFileSync } = require('fs');
const minimist = require('minimist');
const semver = require('semver');
const ora = require('ora');
const del = require('del');

const {
  cloneAndCheckout,
  createAutocompleteDefinitions,
  createAutocompleteExports,
} = require('./utils');
const { supportedContexts } = require('./constants');

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
  del.sync([`${autocompleteOutputFolder}/**`]);

  cloneAndCheckout(
    { log, tag: opts.tag, branch: opts.branch },
    (err, { esPainlessContextFolder }) => {
      if (err) {
        log.fail(err.message);
        return;
      }

      const painlessContextFolderContents = readdirSync(esPainlessContextFolder);

      // Generate autocomplete definitions
      painlessContextFolderContents
        .filter((file) => {
          // Expected filename format: painless-<contextName>.json
          const contextName = file.split('.')[0].split('painless-').pop();
          return supportedContexts.includes(contextName);
        })
        .forEach((file) => {
          try {
            const { name, classes: painlessClasses } = JSON.parse(
              readFileSync(join(esPainlessContextFolder, file), 'utf8')
            );
            const contextName = name ? name : 'common'; // The common allowlist does not have a name associated to it.
            const filePath = join(autocompleteOutputFolder, `${contextName}.json`);
            const code = JSON.stringify(
              { suggestions: createAutocompleteDefinitions(painlessClasses) },
              null,
              2
            );
            writeFileSync(filePath, code, { encoding: 'utf8' });
          } catch (err) {
            log.fail(err.message);
          }
        });

      // Create index.ts file for autocomplete definitions
      const indexFilePath = join(autocompleteOutputFolder, 'index.ts');
      const indexCode = createAutocompleteExports();

      writeFileSync(indexFilePath, indexCode, { encoding: 'utf8' });

      log.succeed('Painless autocomplete definitions generated successfully');
    }
  );
}
