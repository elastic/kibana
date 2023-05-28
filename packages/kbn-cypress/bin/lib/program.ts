/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// https://github.com/currents-dev/cypress-cloud/issues/71
// keep the local copy to prevent from importing
// commander.js from the global node_modules
import { Command, Option } from './@commander-js/extra-typings';

export const createProgram = (command: Command = new Command()) =>
  command
    .name('cypress-cloud')
    .description(
      'Runs Cypress tests on CI using Currents as an orchestration and reporting service'
    )
    .option(
      '-b, --browser <browser-name-or-path>',
      'runs Cypress in the browser with the given name; if a filesystem path is supplied, Cypress will attempt to use the browser at that path'
    )
    .option(
      '--ci-build-id <id>',
      'the unique identifier for a run, this value is automatically detected for most CI providers'
    )
    .addOption(
      new Option('--component', 'runs Cypress component test').default(false).implies({
        e2e: false,
      })
    )
    .option(
      '-c, --config <config>',
      'sets Cypress configuration values. separate multiple values with a comma. overrides any value in cypress.config.{js,ts,mjs,cjs}'
    )
    .option(
      '-e, --env <env>',
      'sets environment variables. separate multiple values with a comma. overrides any value in cypress.config.{js,ts,mjs,cjs} or cypress.env.json'
    )
    .option(
      '-C, --config-file <config-file>',
      'specify Cypress config file, path to script file where Cypress configuration values are set. defaults to "cypress.config.{js,ts,mjs,cjs}"'
    )
    .addOption(new Option('--e2e', 'runs end to end tests').default(true))
    .option('--group <name>', 'a named group for recorded runs in Currents')
    .addOption(
      new Option(
        '-k, --key <record-key>',
        'your secret Record Key obtained from Currents. you can omit this if you set a CURRENTS_RECORD_KEY environment variable'
      ).env('CURRENTS_RECORD_KEY')
    )
    .option(
      '--parallel',
      'enables concurrent runs and automatic load balancing of specs across multiple machines or processes',
      false
    )
    .addOption(
      new Option(
        '-p, --port <number>',
        'runs Cypress on a specific port. overrides any value in cypress.config.{js,ts,mjs,cjs}'
      ).argParser((i) => parseInt(i, 10))
    )
    .option(
      '-P, --project <project-path>',
      'path to your Cypress project root location - defaults to the current working directory'
    )
    .option('-q, --quiet', 'suppress verbose output from Cypress')
    .addOption(
      new Option(
        '--record [bool]',
        'records the run and sends test results, screenshots and videos to Currents'
      )
        .default(true)
        .argParser((i) => (i === 'false' ? false : true))
    )
    .option(
      '-r, --reporter <reporter>',
      'use a specific mocha reporter for Cypress, pass a path to use a custom reporter, defaults to "spec"'
    )
    .option(
      '-o, --reporter-options <reporter-options>',
      'options for the mocha reporter. defaults to "null"'
    )
    .addOption(
      new Option(
        '-s, --spec <spec-pattern>',
        'define specific glob pattern for running the spec file(s), Defaults to the "specMatch" entry from the "cypress.config.{js,ts,mjs,cjs}" file'
      ).argParser(parseCommaSeparatedList)
    )
    .option(
      '-t, --tag <tag>',
      'comma-separated tag(s) for recorded runs in Currents',
      parseCommaSeparatedList
    )
    .addOption(
      new Option(
        '--auto-cancel-after-failures <number | false>',
        "Automatically abort the run after the specified number of failed tests. Overrides the default project settings. If set, must be a positive integer or 'false' to disable (Currents-only)"
      ).argParser(parseAutoCancelFailures)
    );

export const program = createProgram();

function parseCommaSeparatedList(value: string, previous: string[] = []) {
  if (value) {
    return previous.concat(value.split(',').map((t) => t.trim()));
  }
  return previous;
}

function parseAutoCancelFailures(value: string): number | false {
  if (value === 'false') {
    return false;
  }

  const parsedValue = parseInt(value, 10);

  if (isNaN(parsedValue) || parsedValue < 1) {
    throw new Error("Invalid argument provided. Must be a positive integer or 'false'.");
  }

  return parsedValue;
}
