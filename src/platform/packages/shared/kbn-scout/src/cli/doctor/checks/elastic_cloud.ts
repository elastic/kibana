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
import {
  SERVERLESS_ROLES_ROOT_PATH,
  STATEFUL_ROLES_ROOT_PATH,
  readRolesFromResource,
} from '@kbn/es';
import { ScoutTestConfigSchema } from '../../../types/test_config.schema';
import type { CheckResult, DoctorArch, DoctorCheck, Fix } from '../types';
import { DOCTOR_ARCHS, fail, pass, warn } from '../types';
import { tildify } from '../utils';

// QAF reads Cloud credentials from this file, and EC_ENV picks the environment
const CLOUD_SECRETS_FILE = Path.join(Os.homedir(), '.elastic/cloud.json');
const CLOUD_SECRETS = tildify(CLOUD_SECRETS_FILE);
const QAF_ENVIRONMENTS = ['qa', 'staging', 'production'];
const getEnvironment = () => process.env.EC_ENV ?? 'qa';
// Scout logs in with custom roles as custom_role_worker_<n>, Cloud users are set up for the first
export const CUSTOM_ROLE = 'custom_role_worker_1';
// used for test setup, tests don't log in with it
const SKIPPED_ROLES = ['system_indices_superuser'];

// Direct Scout runs read these; QAF writes them for a run and refuses to run when they exist
const SCOUT_CLOUD_CONFIGS: Record<DoctorArch, string> = {
  stateful: '.scout/servers/cloud_ech.json',
  serverless: '.scout/servers/cloud_mki.json',
};
const SCOUT_ROLE_USERS_FILE = '.scout/role_users.json';
const FTR_ROLE_USERS_FILE = '.ftr/role_users.json';

type Users = Record<string, { email?: string; password?: string } | undefined>;

interface CloudSecrets {
  api_key?: Record<string, string>;
  role_credentials?: Record<string, Users>;
}

const readJson = <T>(path: string): T | undefined =>
  Fs.existsSync(path) ? JSON.parse(Fs.readFileSync(path, 'utf8')) : undefined;

const inRepo = (file: string) => Path.resolve(REPO_ROOT, file);

const displayPath = (path: string) =>
  path.startsWith(REPO_ROOT) ? Path.relative(REPO_ROOT, path) : tildify(path);

const readCloudUsers = (): Users =>
  readJson<CloudSecrets>(CLOUD_SECRETS_FILE)?.role_credentials?.[getEnvironment()] ?? {};

const getDefinedRoles = (users: Users) =>
  Object.keys(users).filter((role) => users[role]?.email && users[role]?.password);

const quoteRoles = (roles: string[]) => roles.map((role) => `"${role}"`).join(', ');

const readRoles = (rolesFile: string) =>
  readRolesFromResource(rolesFile).filter((role) => !SKIPPED_ROLES.includes(role));

/** Roles tests log in with, from the roles.yml files of all project types when none is given */
const getRoles = (arch: DoctorArch, projectType?: string): string[] => {
  if (arch === 'stateful') {
    return readRoles(Path.join(STATEFUL_ROLES_ROOT_PATH, 'roles.yml'));
  }
  const rolesFiles = projectType
    ? [Path.join(projectType, 'roles.yml')]
    : Fs.readdirSync(SERVERLESS_ROLES_ROOT_PATH, { recursive: true, encoding: 'utf8' }).filter(
        (file) => Path.basename(file) === 'roles.yml'
      );
  return [
    ...new Set(
      rolesFiles.flatMap((file) => readRoles(Path.join(SERVERLESS_ROLES_ROOT_PATH, file)))
    ),
  ];
};

const checkUsers = (
  file: string,
  users: Users,
  expected: string[],
  remedy?: Fix | string,
  label = 'users for'
): CheckResult => {
  const roles = [...new Set(expected)];
  const defined = getDefinedRoles(users);
  const missing = roles.filter((role) => !defined.includes(role));
  if (!missing.length) {
    return pass(
      `${file} has ${label} ${roles.length > 3 ? `all ${roles.length} roles` : quoteRoles(roles)}`
    );
  }

  const message = `${file} has no ${label} ${
    missing.length > 1 ? `${missing.length} roles` : quoteRoles(missing)
  }`;
  const result = {
    ...(missing.length > 1 ? { details: quoteRoles(missing) } : {}),
    ...(typeof remedy === 'string'
      ? { hint: remedy }
      : remedy && { fix: remedy, hint: `only if they are ${getEnvironment()} users` }),
  };
  return missing.includes('admin') ? fail(message, result) : warn(message, result);
};

const copyFtrUsersFix = (expected: string[]): Fix | undefined => {
  const ftrUsers = readJson<Users>(inRepo(FTR_ROLE_USERS_FILE));
  const cloudRoles = getDefinedRoles(readCloudUsers());
  // copy every role QAF is missing, so all checks suggest the same command
  const roles = getDefinedRoles(ftrUsers ?? {}).filter((role) => !cloudRoles.includes(role));
  if (!ftrUsers || !roles.some((role) => expected.includes(role))) {
    return undefined;
  }

  const env = getEnvironment();
  return {
    command: `copy ${roles.join(
      ', '
    )} from ${FTR_ROLE_USERS_FILE} to role_credentials.${env} in ${CLOUD_SECRETS}`,
    destructive: true,
    run: async () => {
      const secrets = readJson<CloudSecrets>(CLOUD_SECRETS_FILE) ?? {};
      const copied = Object.fromEntries(roles.map((role) => [role, ftrUsers[role]]));
      const updated: CloudSecrets = {
        ...secrets,
        role_credentials: {
          ...secrets.role_credentials,
          [env]: { ...secrets.role_credentials?.[env], ...copied },
        },
      };
      await Fs.promises.mkdir(Path.dirname(CLOUD_SECRETS_FILE), { recursive: true });
      await Fs.promises.writeFile(CLOUD_SECRETS_FILE, `${JSON.stringify(updated, null, 2)}\n`, {
        mode: 0o600,
      });
    },
  };
};

/** For the QAF create command, which assigns the custom role to this user */
export const hasQafCustomRoleUser = (): boolean => {
  try {
    return getDefinedRoles(readCloudUsers()).includes(CUSTOM_ROLE);
  } catch {
    return false;
  }
};

const environmentCheck: DoctorCheck = {
  title: 'Elastic Cloud environment',
  run: async () => {
    const env = getEnvironment();
    return QAF_ENVIRONMENTS.includes(env)
      ? pass(
          `Elastic Cloud environment ${env} (${
            process.env.EC_ENV ? 'from EC_ENV' : 'EC_ENV not set'
          })`
        )
      : fail(`QAF doesn't support EC_ENV=${env}`, { hint: `use ${QAF_ENVIRONMENTS.join(', ')}` });
  },
};

const apiKeyCheck: DoctorCheck = {
  title: 'Elastic Cloud API key',
  dependsOn: environmentCheck,
  run: async () => {
    const env = getEnvironment();
    const secrets = readJson<CloudSecrets>(CLOUD_SECRETS_FILE);
    if (!secrets) {
      return fail(`${CLOUD_SECRETS} does not exist`, {
        hint: `create it with api_key.${env} and role_credentials.${env}`,
      });
    }
    return secrets.api_key?.[env]
      ? pass(`${CLOUD_SECRETS} has API key "${env}"`)
      : fail(`${CLOUD_SECRETS} has no API key "${env}"`, {
          hint: `create one in the Elastic Cloud ${env} console (Organization → API keys) and add it as api_key.${env}`,
        });
  },
};

const cloudUsersCheck = (arch: DoctorArch): DoctorCheck => ({
  title: 'Cloud users',
  arch,
  dependsOn: environmentCheck,
  run: async () => {
    const roles = getRoles(arch);
    return checkUsers(
      `${CLOUD_SECRETS} (${getEnvironment()})`,
      readCloudUsers(),
      roles,
      copyFtrUsersFix(roles) ??
        `create Cloud users with these roles and add them under role_credentials.${getEnvironment()}`
    );
  },
});

const qafCustomRoleCheck: DoctorCheck = {
  title: 'Cloud user for custom roles',
  // on ECH custom roles log in through the SAML realm QAF adds, without a Cloud user
  arch: 'serverless',
  dependsOn: environmentCheck,
  run: async () =>
    checkUsers(
      `${CLOUD_SECRETS} (${getEnvironment()})`,
      readCloudUsers(),
      [CUSTOM_ROLE],
      copyFtrUsersFix([CUSTOM_ROLE]) ??
        `create a Cloud user and add it under role_credentials.${getEnvironment()}, QAF assigns it the role when creating a project`,
      'custom role user'
    ),
};

const qafLeftoversCheck: DoctorCheck = {
  title: 'Scout Cloud configs that block QAF',
  run: async () => {
    const files = [SCOUT_ROLE_USERS_FILE, ...Object.values(SCOUT_CLOUD_CONFIGS)].filter((file) =>
      Fs.existsSync(inRepo(file))
    );
    if (!files.length) {
      return undefined;
    }
    return warn(
      `QAF won't run while ${files.join(', ')} ${files.length > 1 ? 'exist' : 'exists'}`,
      {
        hint: 'left by a direct Scout run or an interrupted QAF run',
        fix: { command: `rm -f ${files.join(' ')}`, destructive: true },
      }
    );
  },
};

export const getQafCloudChecks = (): DoctorCheck[] => [
  environmentCheck,
  apiKeyCheck,
  ...DOCTOR_ARCHS.map(cloudUsersCheck),
  qafCustomRoleCheck,
  qafLeftoversCheck,
];

// only called by checks that depend on scoutConfigCheck, so the file is valid
const readScoutConfig = (arch: DoctorArch) =>
  ScoutTestConfigSchema.parse(readJson(inRepo(SCOUT_CLOUD_CONFIGS[arch])));

/** Validates a direct Scout run config with the schema Scout uses */
const scoutConfigCheck = (arch: DoctorArch): DoctorCheck => ({
  title: SCOUT_CLOUD_CONFIGS[arch],
  arch,
  run: async () => {
    const configFile = SCOUT_CLOUD_CONFIGS[arch];
    let raw: unknown;
    try {
      raw = readJson(inRepo(configFile));
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

    const { isCloud, serverless, projectType, productTier, hosts } = result.data;
    // the schema can't tell which file it reads
    if (!isCloud || Boolean(serverless) !== (arch === 'serverless')) {
      return fail(
        `${configFile} must set "isCloud": true and "serverless": ${arch === 'serverless'}`
      );
    }
    const target = serverless
      ? `${[projectType, productTier].filter(Boolean).join(' ')} project`
      : 'deployment';
    return pass(`${configFile} is valid: ${target} at ${new URL(hosts.kibana).host}`);
  },
});

// projects and deployments get deleted while the config pointing to them stays
const scoutKibanaCheck = (arch: DoctorArch, configCheck: DoctorCheck): DoctorCheck => ({
  title: `Kibana in ${SCOUT_CLOUD_CONFIGS[arch]}`,
  arch,
  dependsOn: configCheck,
  run: async () => {
    const { hosts, auth } = readScoutConfig(arch);
    const { host } = new URL(hosts.kibana);
    const remedy = { hint: 'the project or deployment may be deleted' };
    try {
      const response = await fetch(new URL('/api/status', hosts.kibana), {
        headers: {
          Authorization: `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString(
            'base64'
          )}`,
        },
        signal: AbortSignal.timeout(10_000),
      });
      if (response.status === 401) {
        return fail(`Kibana at ${host} rejects the auth credentials`);
      }
      if (!response.ok) {
        return fail(`Kibana at ${host} responds with ${response.status}`, remedy);
      }
      const { version } = await response.json();
      return pass(`Kibana ${version?.number} at ${host} is up`);
    } catch (error) {
      return fail(
        `Kibana at ${host} is not reachable: ${error.cause?.code ?? error.message}`,
        remedy
      );
    }
  },
});

const scoutUsersCheck = (arch: DoctorArch, configCheck: DoctorCheck): DoctorCheck => ({
  title: `Cloud users for ${SCOUT_CLOUD_CONFIGS[arch]}`,
  arch,
  dependsOn: configCheck,
  run: async () => {
    const { cloudUsersFilePath, projectType } = readScoutConfig(arch);
    // Scout resolves it against the working directory, which is the repo root
    const usersFile = inRepo(cloudUsersFilePath);
    const users = readJson<Users>(usersFile);
    return users
      ? checkUsers(displayPath(usersFile), users, getRoles(arch, projectType))
      : fail(`${displayPath(usersFile)} does not exist`, {
          hint: `set as cloudUsersFilePath in ${SCOUT_CLOUD_CONFIGS[arch]}`,
        });
  },
});

const scoutCustomRoleCheck = (arch: DoctorArch, configCheck: DoctorCheck): DoctorCheck => ({
  title: `Custom roles with ${SCOUT_CLOUD_CONFIGS[arch]}`,
  arch,
  dependsOn: configCheck,
  run: async () => {
    const configFile = SCOUT_CLOUD_CONFIGS[arch];
    const { customSamlProviderName, cloudUsersFilePath } = readScoutConfig(arch);
    if (arch === 'serverless') {
      const usersFile = inRepo(cloudUsersFilePath);
      return checkUsers(
        displayPath(usersFile),
        readJson<Users>(usersFile) ?? {},
        [CUSTOM_ROLE],
        'add a user with the custom role in the project',
        'custom role user'
      );
    }
    return customSamlProviderName
      ? pass(`${configFile} logs in custom roles via SAML provider "${customSamlProviderName}"`)
      : warn(`${configFile} has no customSamlProviderName for custom roles`, {
          hint: 'create the deployment with --add-custom-saml-realm, then set "customSamlProviderName": "qaf"',
        });
  },
});

/** Checks for running Scout against Cloud without QAF, only for config files that exist */
export const getScoutCloudChecks = (): DoctorCheck[] =>
  DOCTOR_ARCHS.filter((arch) => Fs.existsSync(inRepo(SCOUT_CLOUD_CONFIGS[arch]))).flatMap(
    (arch) => {
      const configCheck = scoutConfigCheck(arch);
      return [
        configCheck,
        scoutKibanaCheck(arch, configCheck),
        scoutUsersCheck(arch, configCheck),
        scoutCustomRoleCheck(arch, configCheck),
      ];
    }
  );
