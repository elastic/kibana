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

import chalk from 'chalk';
import yargs, { Arguments } from 'yargs';

import * as args from './args';
import { createServeCommand } from './commands';

const onCliError = (reason?: Error | string) => {
  if (reason !== undefined) {
    // tslint:disable no-console
    console.error(`
${chalk.white.bgRed(' CLI ERROR ')} ${reason}

Specify --help for available options
`);
  }

  process.exit(reason === undefined ? 0 : 64);
};

export const parseArgv = (argv: string[]): Arguments => {
  return yargs(argv)
    .usage(`${args.usage}\n\n${args.description}`)
    .scriptName('')
    .version()
    .alias('h', 'help')
    .alias('v', 'version')
    .command(createServeCommand())
    .showHelpOnFail(false)
    .fail((msg: string) => onCliError(msg))
    .help()
    .epilogue(args.docs)
    .wrap(yargs.terminalWidth()).argv;
};

export const run = () => {
  const argv = process.env.kbnWorkerArgv ? JSON.parse(process.env.kbnWorkerArgv) : process.argv;

  const cliArgs = parseArgv(argv.slice(2));
  if (cliArgs._.length > 0) {
    onCliError(`unknown command ${cliArgs._[0]}`);
  }
};

run();
