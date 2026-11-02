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
import { ScoutTestConfigSchema } from '../../../types/test_config.schema';
import type { CheckResult, DoctorCheck, DoctorCheckGroup } from '../types';
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

// Direct Scout runs read these; QAF writes them for a run and refuses to run when they exist
const SCOUT_CLOUD_CONFIGS: Record<DoctorArch, string> = {
  stateful: '.scout/servers/cloud_ech.json',
  serverless: '.scout/servers/cloud_mki.json',
};
const SCOUT_ROLE_USERS_FILE = '.scout/role_users.json';

type Users = Record<string, { email?: string; password?: string } | undefined>;

interface CloudSecrets {
  api_key?: Record<string, string>;
  role_credentials?: Record<string, Users>;
}

const readJson = async <T>(path: string): Promise<T | undefined> => {
  const content = await Fs.promises.readFile(path, 'utf8').catch(() => undefined);
  return content === undefined ? undefined : JSON.parse(content);
};

const displayPath = (path: string) =>
  path.startsWith(REPO_ROOT) ? Path.relative(REPO_ROOT, path) : tildify(path);

const archsOf = (arch?: DoctorArch): DoctorArch[] => (arch ? [arch] : ['stateful', 'serverless']);

const checkUsers = (source: string, users: Users, expected: string[]): CheckResult => {
  const defined = Object.keys(users).filter((role) => users[role]?.email && users[role]?.password);
  if (!defined.includes('admin')) {
    return fail(`No admin user in ${source}`);
  }

  const missing = [...new Set(expected)].filter((role) => !defined.includes(role));
  return missing.length
    ? warn(`${source}: ${defined.join(', ')}, missing ${missing.join(', ')}`, {
        hint: `tests that log in as ${missing.join(' or ')} will fail`,
      })
    : pass(`${source}: ${defined.join(', ')}`);
};

const qafUsersCheck = (arch?: DoctorArch): DoctorCheck => ({
  title: 'QAF Cloud users',
  run: async () => {
    const env = getEnvironment();
    const secrets = await readJson<CloudSecrets>(CLOUD_SECRETS_FILE);
    if (!secrets) {
      return fail(`${tildify(CLOUD_SECRETS_FILE)} does not exist`, {
        hint: `add Cloud users under role_credentials.${env}`,
      });
    }

    return checkUsers(
      `QAF Cloud users (role_credentials.${env})`,
      secrets.role_credentials?.[env] ?? {},
      archsOf(arch).flatMap((target) => ROLES_BY_ARCH[target])
    );
  },
});

const apiKeyCheck: DoctorCheck = {
  title: 'Elastic Cloud API key',
  run: async () => {
    const env = getEnvironment();
    const secrets = await readJson<CloudSecrets>(CLOUD_SECRETS_FILE);
    return secrets?.api_key?.[env]
      ? pass(`Elastic Cloud API key (${env}) is set`)
      : fail(`No Elastic Cloud API key under api_key.${env} in ${tildify(CLOUD_SECRETS_FILE)}`, {
          hint: 'QAF needs it to create projects and deployments',
        });
  },
};

/** Validates a direct Scout run config with the schema Scout uses when it loads it */
const scoutConfigCheck = (arch: DoctorArch): DoctorCheck => ({
  title: SCOUT_CLOUD_CONFIGS[arch],
  run: async () => {
    const configFile = SCOUT_CLOUD_CONFIGS[arch];
    let raw: unknown;
    try {
      raw = await readJson(Path.resolve(REPO_ROOT, configFile));
    } catch (error) {
      return fail(`${configFile} is not valid JSON: ${error.message}`);
    }

    const result = ScoutTestConfigSchema.safeParse(raw);
    if (!result.success) {
      const issues = result.error.issues.map(
        ({ path, message }) => `${path.join('.') || '<root>'} ${message}`
      );
      return fail(`${configFile} is invalid: ${issues.join('; ')}`);
    }

    const config = result.data;
    // the schema can't tell which file it reads
    const serverless = arch === 'serverless';
    if (!config.isCloud || Boolean(config.serverless) !== serverless) {
      return fail(`${configFile} must set "isCloud": true and "serverless": ${serverless}`);
    }

    const target = serverless
      ? `${[config.projectType, config.productTier].filter(Boolean).join(' ')} project`
      : 'deployment';
    return pass(`${configFile} is valid: ${target} at ${new URL(config.hosts.kibana).host}`);
  },
});

/** Checks the users file a direct Scout run reads, as set by cloudUsersFilePath */
const scoutUsersCheck = (arch: DoctorArch): DoctorCheck => ({
  title: `Scout Cloud users for ${SCOUT_CLOUD_CONFIGS[arch]}`,
  run: async () => {
    const configFile = SCOUT_CLOUD_CONFIGS[arch];
    const config = await readJson<{ cloudUsersFilePath?: string; projectType?: string }>(
      Path.resolve(REPO_ROOT, configFile)
    );
    if (!config?.cloudUsersFilePath) {
      return fail(`${configFile} has no cloudUsersFilePath`);
    }
    // Scout resolves it against the working directory, which is the repo root
    const usersFile = Path.resolve(REPO_ROOT, config.cloudUsersFilePath);
    const users = await readJson<Users>(usersFile);
    if (!users) {
      return fail(`${displayPath(usersFile)} does not exist`, {
        hint: `${configFile} reads Cloud users from it`,
      });
    }

    const projectRole = config.projectType && PROJECT_DEFAULT_ROLES.get(config.projectType);
    const expected =
      arch === 'stateful'
        ? ROLES_BY_ARCH.stateful
        : ['admin', 'viewer', ...(projectRole ? [projectRole] : [])];
    return checkUsers(`Scout Cloud users (${displayPath(usersFile)})`, users, expected);
  },
});

const qafRunFilesCheck = (arch?: DoctorArch): DoctorCheck => ({
  title: 'Files that block QAF runs',
  run: async () => {
    const existing = [
      SCOUT_ROLE_USERS_FILE,
      ...archsOf(arch).map((target) => SCOUT_CLOUD_CONFIGS[target]),
    ].filter((file) => Fs.existsSync(Path.resolve(REPO_ROOT, file)));
    return existing.length
      ? warn(
          `QAF won't run while ${existing.join(', ')} ${existing.length > 1 ? 'exist' : 'exists'}`,
          {
            hint: 'direct Scout runs use them, remove them to run with QAF',
            fix: { command: `rm -f ${existing.join(' ')}`, destructive: true },
          }
        )
      : pass('No files that block QAF runs');
  },
});

const readConfigSync = (arch: DoctorArch): { cloudUsersFilePath?: unknown } | undefined => {
  try {
    return JSON.parse(Fs.readFileSync(Path.resolve(REPO_ROOT, SCOUT_CLOUD_CONFIGS[arch]), 'utf8'));
  } catch {
    return undefined;
  }
};

export const getElasticCloudChecks = (arch?: DoctorArch): DoctorCheckGroup => ({
  title: 'Elastic Cloud',
  checks: [
    qafUsersCheck(arch),
    apiKeyCheck,
    ...archsOf(arch)
      .filter((target) => Fs.existsSync(Path.resolve(REPO_ROOT, SCOUT_CLOUD_CONFIGS[target])))
      .flatMap((target) => [
        scoutConfigCheck(target),
        // a config without cloudUsersFilePath is already reported as invalid
        ...(readConfigSync(target)?.cloudUsersFilePath ? [scoutUsersCheck(target)] : []),
      ]),
    qafRunFilesCheck(arch),
  ],
});
