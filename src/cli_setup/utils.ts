/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getConfigPath, getDataPath } from '@kbn/utils';
import inquirer from 'inquirer';
import { duration } from 'moment';
import { merge } from 'lodash';
import { kibanaPackageJson } from '@kbn/utils';

import { Logger } from '@kbn/core/server';
import { ClusterClient } from '@kbn/core/server/elasticsearch/client';
import { configSchema } from '@kbn/core/server/elasticsearch';
import { ElasticsearchService } from '@kbn/interactive-setup-plugin/server/elasticsearch_service';
import { KibanaConfigWriter } from '@kbn/interactive-setup-plugin/server/kibana_config_writer';
import type { EnrollmentToken } from '@kbn/interactive-setup-plugin/common';

const noop = () => {};
const logger: Logger = {
  debug: noop,
  error: noop,
  warn: noop,
  trace: noop,
  info: noop,
  fatal: noop,
  log: noop,
  get: () => logger,
};

export const kibanaConfigWriter = new KibanaConfigWriter(getConfigPath(), getDataPath(), logger);
export const elasticsearch = new ElasticsearchService(logger, kibanaPackageJson.version).setup({
  connectionCheckInterval: duration(Infinity),
  elasticsearch: {
    createClient: (type, config) => {
      const defaults = configSchema.validate({});
      return new ClusterClient({
        config: merge(
          defaults,
          {
            hosts: Array.isArray(defaults.hosts) ? defaults.hosts : [defaults.hosts],
          },
          config
        ),
        logger,
        type,
      });
    },
  },
});

export async function promptToken() {
  const answers = await inquirer.prompt({
    type: 'input',
    name: 'token',
    message: 'Enter enrollment token:',
    validate: (value = '') => (decodeEnrollmentToken(value) ? true : 'Invalid enrollment token'),
  });
  return answers.token;
}

export function decodeEnrollmentToken(enrollmentToken: string): EnrollmentToken | undefined {
  try {
    const json = JSON.parse(atob(enrollmentToken)) as EnrollmentToken;
    if (
      !Array.isArray(json.adr) ||
      json.adr.some((adr) => typeof adr !== 'string') ||
      typeof json.fgr !== 'string' ||
      typeof json.key !== 'string' ||
      typeof json.ver !== 'string'
    ) {
      return;
    }
    return { ...json, adr: json.adr.map((adr) => `https://${adr}`), key: btoa(json.key) };
  } catch (error) {} // eslint-disable-line no-empty
}

function btoa(str: string) {
  return Buffer.from(str, 'binary').toString('base64');
}

function atob(str: string) {
  return Buffer.from(str, 'base64').toString('binary');
}

export function getCommand(command: string, args?: string) {
  const isWindows = process.platform === 'win32';
  return `${isWindows ? `bin\\${command}.bat` : `bin/${command}`}${args ? ` ${args}` : ''}`;
}
