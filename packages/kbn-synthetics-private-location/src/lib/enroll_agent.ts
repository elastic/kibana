/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import execa from 'execa';
import { spawn } from 'child_process';
import * as path from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import { CliOptions } from '../types';

export async function enrollAgent(
  { fleetServerUrl, kibanaUrl, kibanaPassword, kibanaUsername, elasticsearchHost }: CliOptions,
  logger: ToolingLog,
  enrollmentToken: string
) {
  const formattedKibanaURL = new URL(kibanaUrl);
  if (formattedKibanaURL.hostname === 'localhost') {
    formattedKibanaURL.hostname = 'host.docker.internal';
  }
  await new Promise((res, rej) => {
    try {
      const fleetProcess = spawn(
        'docker',
        [
          'run',
          '-e',
          'FLEET_SERVER_ENABLE=1',
          '-e',
          `FLEET_SERVER_ELASTICSEARCH_HOST=${elasticsearchHost}`,
          '-e',
          'FLEET_SERVER_POLICY_ID=fleet-server-policy',
          '-e',
          'FLEET_INSECURE=1',
          '-e',
          `KIBANA_HOST=${formattedKibanaURL.href}`,
          '-e',
          'KIBANA_USERNAME=elastic',
          '-e',
          'KIBANA_PASSWORD=changeme',
          '-e',
          'KIBANA_FLEET_SETUP=1',
          '-p',
          '8220:8220',
          '--rm',
          'docker.elastic.co/beats/elastic-agent:8.16.0-SNAPSHOT',
        ],
        {
          shell: true,
          cwd: path.join(__dirname, '../'),
          timeout: 120000,
        }
      );
      setTimeout(res, 10_000);
      fleetProcess.on('error', rej);
    } catch (error) {
      rej(error);
    }
  });

  execa(
    'docker',
    [
      'run',
      '-e',
      'FLEET_URL=https://host.docker.internal:8220',
      '-e',
      'FLEET_ENROLL=1',
      '-e',
      `FLEET_ENROLLMENT_TOKEN=${enrollmentToken}`,
      '-e',
      'FLEET_INSECURE=1',
      '--rm',
      'docker.elastic.co/beats/elastic-agent-complete:8.15.0-SNAPSHOT',
    ],
    {
      stdio: 'inherit',
    }
  );
}
