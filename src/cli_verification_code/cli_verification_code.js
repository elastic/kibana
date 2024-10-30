/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDataPath } from '@kbn/utils';
import { kibanaPackageJson } from '@kbn/repo-info';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';

import Command from '../cli/command';

const program = new Command('bin/kibana-verification-code');

program
  .version(kibanaPackageJson.version)
  .description('Tool to get Kibana verification code')
  .action(() => {
    const fpath = path.join(getDataPath(), 'verification_code');
    try {
      const code = fs.readFileSync(fpath).toString();
      console.log(
        `Your verification code is: ${chalk.black.bgCyanBright(
          ` ${code.substr(0, 3)} ${code.substr(3)} `
        )}`
      );
    } catch (error) {
      console.log(`Couldn't find verification code.

If Kibana hasn't been configured yet, restart Kibana to generate a new code.

Otherwise, you can safely ignore this message and start using Kibana.`);
    }
  });

program.parse(process.argv);
