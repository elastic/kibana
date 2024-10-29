/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Command } from 'commander';
import { kibanaPackageJson } from '@kbn/repo-info';
import { bootstrap } from '@kbn/health-gateway-server';

const program = new Command('bin/kibana-health-gateway');

program
  .version(kibanaPackageJson.version)
  .description(
    'This command starts up a health gateway server that can be ' +
      'configured to send requests to multiple Kibana instances'
  )
  .option('-c, --config', 'Path to a gateway.yml configuration file')
  .action(async () => {
    return await bootstrap();
  });

program.parse(process.argv);
