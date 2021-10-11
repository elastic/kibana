/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint no-console: "off" */

import { kibanaPackageJson } from '@kbn/utils';
import chalk from 'chalk';
import ora from 'ora';
import { Command } from 'commander';
import { getConfigPath } from '@kbn/utils';

import {
  ElasticsearchService,
  EnrollResult,
} from '../plugins/interactive_setup/server/elasticsearch_service';
import { getDetailedErrorMessage } from '../plugins/interactive_setup/server/errors';
import { promptToken, decodeEnrollmentToken, kibanaConfigWriter, elasticsearch } from './utils';

const program = new Command('bin/kibana-init');

program
  .version(kibanaPackageJson.version)
  .description(
    'This command walks you through all required steps to securely connect Kibana with Elasticsearch'
  )
  .option('-t, --token <token>', 'Elasticseach enrollment token');

program.parse(process.argv);

const spinner = ora();
const options = program.opts();

async function initCommand() {
  const token = decodeEnrollmentToken(options.token ?? (await promptToken()));
  if (!token) {
    console.log(chalk.red('Invalid enrollment token provided.'));
    console.log();
    console.log('To generate a new enrollment token run:');
    console.log('  bin/elasticsearch-create-enrollment-token -s kibana');
    return;
  }

  if (!(await kibanaConfigWriter.isConfigWritable())) {
    console.log(chalk.red('Kibana does not have enough permissions to write to the config file.'));
    console.log();
    console.log('To grant write access run:');
    console.log(`  chmod +w ${getConfigPath()}`);
  }

  console.log();
  spinner.start(chalk.dim('Configuring Kibana...'));

  let configToWrite: EnrollResult;
  try {
    configToWrite = await elasticsearch.enroll({
      hosts: token.adr,
      apiKey: token.key,
      caFingerprint: ElasticsearchService.formatFingerprint(token.fgr),
    });
  } catch (error) {
    spinner.fail(
      `${chalk.bold('Unable to enroll with Elasticsearch:')} ${chalk.red(
        `${getDetailedErrorMessage(error)}`
      )}`
    );
    console.log();
    console.log('To generate a new enrollment token run:');
    console.log('  bin/elasticsearch-create-enrollment-token -s kibana');
    return;
  }

  try {
    await kibanaConfigWriter.writeConfig(configToWrite);
  } catch (error) {
    spinner.fail(
      `${chalk.bold('Unable to configure Kibana:')} ${chalk.red(
        `${getDetailedErrorMessage(error)}`
      )}`
    );
    console.log(chalk.red(`${getDetailedErrorMessage(error)}`));
    return;
  }

  spinner.succeed(chalk.bold('Kibana configured successfully.'));
  console.log();
  console.log('To start Kibana run:');
  console.log('  bin/kibana');
}

initCommand();
