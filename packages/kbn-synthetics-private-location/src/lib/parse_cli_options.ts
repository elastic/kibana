/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Command } from 'commander';
import { CliOptions } from '../types';
import { DEFAULTS } from '../constants';

export function parseCliOptions(): CliOptions {
  const program = new Command();
  program
    .name('synthetics_private_location.js')
    .description(
      'A script to start Fleet Server, enroll Elastic Agent, and create a Synthetics private location'
    )
    .option(
      '--elasticsearch-host <address>',
      'The address to the Elasticsearch cluster',
      DEFAULTS.ELASTICSEARCH_HOST
    )
    .option('--kibana-url <address>', 'The address to the Kibana server', DEFAULTS.KIBANA_URL)
    .option(
      '--kibana-username <username>',
      'The username for the Kibana server',
      DEFAULTS.KIBANA_USERNAME
    )
    .option(
      '--kibana-password <password>',
      'The password for the Kibana server',
      DEFAULTS.KIBANA_PASSWORD
    )
    .option(
      '--location-name <name>',
      'The name of the Synthetics private location',
      DEFAULTS.LOCATION_NAME
    )
    .option(
      '--agent-policy-name <name>',
      'The name of the agent policy',
      DEFAULTS.AGENT_POLICY_NAME
    );

  program.parse(process.argv);
  return program.opts() as CliOptions;
}
