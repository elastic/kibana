/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { PROJECT_DEFAULT_ROLES } from '../../../common/constants';
import type { DoctorCheck, DoctorCheckGroup } from '../types';
import { fail, pass, warn } from '../types';
import type { DoctorArch } from '../run_doctor';
import { tildify } from '../utils';

// QAF reads Cloud credentials from this file, and EC_ENV picks the environment (qa by default)
const CLOUD_SECRETS_FILE = Path.join(Os.homedir(), '.elastic/cloud.json');
const getEnvironment = () => process.env.EC_ENV ?? 'qa';

const ROLES_BY_ARCH: Record<DoctorArch, string[]> = {
  stateful: ['admin', 'editor', 'viewer'],
  serverless: ['admin', 'viewer', ...new Set(PROJECT_DEFAULT_ROLES.values())],
};

// QAF writes these for a run and removes them after; it refuses to run when they already exist
const QAF_RUN_FILES: Record<DoctorArch, string> = {
  stateful: '.scout/servers/cloud_ech.json',
  serverless: '.scout/servers/cloud_mki.json',
};

interface CloudSecrets {
  api_key?: Record<string, string>;
  role_credentials?: Record<string, Record<string, { email?: string; password?: string }>>;
}

const readCloudSecrets = async (): Promise<CloudSecrets | undefined> => {
  const content = await Fs.promises.readFile(CLOUD_SECRETS_FILE, 'utf8').catch(() => undefined);
  return content === undefined ? undefined : JSON.parse(content);
};

const archsOf = (arch?: DoctorArch): DoctorArch[] => (arch ? [arch] : ['stateful', 'serverless']);

const cloudUsersCheck = (arch?: DoctorArch): DoctorCheck => ({
  title: 'Cloud users',
  run: async () => {
    const env = getEnvironment();
    const secrets = await readCloudSecrets();
    if (!secrets) {
      return fail(`${tildify(CLOUD_SECRETS_FILE)} does not exist`, {
        hint: `add Cloud users under role_credentials.${env}`,
      });
    }

    const users = secrets.role_credentials?.[env] ?? {};
    const defined = Object.keys(users).filter((role) => users[role].email && users[role].password);
    if (!defined.includes('admin')) {
      return fail(`No admin user under role_credentials.${env} in ${tildify(CLOUD_SECRETS_FILE)}`);
    }

    const expected = [...new Set(archsOf(arch).flatMap((target) => ROLES_BY_ARCH[target]))];
    const missing = expected.filter((role) => !defined.includes(role));
    return missing.length
      ? warn(`Cloud users (${env}): ${defined.join(', ')}, missing ${missing.join(', ')}`, {
          hint: `tests that log in as ${missing.join(' or ')} will fail`,
        })
      : pass(`Cloud users (${env}): ${defined.join(', ')}`);
  },
});

const apiKeyCheck: DoctorCheck = {
  title: 'Elastic Cloud API key',
  run: async () => {
    const env = getEnvironment();
    const secrets = await readCloudSecrets();
    return secrets?.api_key?.[env]
      ? pass(`Elastic Cloud API key (${env}) is set`)
      : fail(`No Elastic Cloud API key under api_key.${env} in ${tildify(CLOUD_SECRETS_FILE)}`, {
          hint: 'QAF needs it to create projects and deployments',
        });
  },
};

const qafRunFilesCheck = (arch?: DoctorArch): DoctorCheck => ({
  title: 'Files left from earlier QAF runs',
  run: async () => {
    const leftovers = [
      '.scout/role_users.json',
      ...archsOf(arch).map((target) => QAF_RUN_FILES[target]),
    ].filter((file) => Fs.existsSync(Path.resolve(REPO_ROOT, file)));
    return leftovers.length
      ? fail(`QAF won't run while ${leftovers.join(', ')} exists`, {
          hint: 'left from an earlier run or a manual setup',
          fix: { command: `rm -f ${leftovers.join(' ')}`, destructive: true },
        })
      : pass('No files left from earlier QAF runs');
  },
});

export const getElasticCloudChecks = (arch?: DoctorArch): DoctorCheckGroup => ({
  title: 'Elastic Cloud',
  checks: [cloudUsersCheck(arch), apiKeyCheck, qafRunFilesCheck(arch)],
});
