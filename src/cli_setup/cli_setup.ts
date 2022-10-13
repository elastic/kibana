/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { kibanaPackageJson } from '@kbn/utils';
import chalk from 'chalk';
import ora from 'ora';
import { Command } from 'commander';
import { getConfigPath } from '@kbn/utils';

import {
  ElasticsearchService,
  EnrollResult,
} from '@kbn/interactive-setup-plugin/server/elasticsearch_service';
import { getDetailedErrorMessage } from '@kbn/interactive-setup-plugin/server/errors';
import {
  promptToken,
  getCommand,
  decodeEnrollmentToken,
  kibanaConfigWriter,
  elasticsearch,
} from './utils';
import { Logger } from '../cli_plugin/lib/logger';

const program = new Command('bin/kibana-setup');

program
  .version(kibanaPackageJson.version)
  .description(
    'This command walks you through all required steps to securely connect Kibana with Elasticsearch'
  )
  .option('-t, --enrollment-token <token>', 'Elasticsearch enrollment token')
  .option('-s, --silent', 'Prevent all logging');

program.parse(process.argv);

interface SetupOptions {
  enrollmentToken?: string;
  silent?: boolean;
}

const options = program.opts() as SetupOptions;
const spinner = ora();
const logger = new Logger(options);

async function initCommand() {
  const token = decodeEnrollmentToken(
    options.enrollmentToken ?? (options.silent ? undefined : await promptToken())
  );
  if (!token) {
    logger.error(chalk.red('Invalid enrollment token provided.'));
    logger.error('');
    logger.error('To generate a new enrollment token run:');
    logger.error(`  ${getCommand('elasticsearch-create-enrollment-token', '-s kibana')}`);
    process.exit(1);
  }

  if (!(await kibanaConfigWriter.isConfigWritable())) {
    logger.error(chalk.red('Kibana does not have enough permissions to write to the config file.'));
    logger.error('');
    logger.error('To grant write access run:');
    logger.error(`  chmod +w ${getConfigPath()}`);
    process.exit(1);
  }

  logger.log('');
  if (!options.silent) {
    spinner.start(chalk.dim('Configuring Kibana...'));
  }

  let configToWrite: EnrollResult;
  try {
    configToWrite = await elasticsearch.enroll({
      hosts: token.adr,
      apiKey: token.key,
      caFingerprint: ElasticsearchService.formatFingerprint(token.fgr),
    });
  } catch (error) {
    if (!options.silent) {
      spinner.fail(
        `${chalk.bold(
          'Unable to connect to Elasticsearch with the provided enrollment token:'
        )} ${chalk.red(`${getDetailedErrorMessage(error)}`)}`
      );
    }
    logger.error('');
    logger.error('To generate a new enrollment token run:');
    logger.error(`  ${getCommand('elasticsearch-create-enrollment-token', '-s kibana')}`);
    process.exit(1);
  }

  try {
    await kibanaConfigWriter.writeConfig(configToWrite);
  } catch (error) {
    if (!options.silent) {
      spinner.fail(
        `${chalk.bold('Unable to configure Kibana:')} ${chalk.red(
          `${getDetailedErrorMessage(error)}`
        )}`
      );
    }
    logger.error(chalk.red(`${getDetailedErrorMessage(error)}`));
    process.exit(1);
  }

  if (!options.silent) {
    spinner.succeed(chalk.bold('Kibana configured successfully.'));
  }
  logger.log('');
  logger.log('To start Kibana run:');
  logger.log(`  ${getCommand('kibana')}`);
}

initCommand();
