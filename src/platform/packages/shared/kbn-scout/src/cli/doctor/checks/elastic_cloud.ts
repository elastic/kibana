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
import type { CheckResult, DoctorArch, DoctorCheck, Fix } from '../types';
import { DOCTOR_ARCHS, fail, pass, warn } from '../types';
import { tildify } from '../utils';

// QAF reads Cloud credentials from this file, and EC_ENV picks the environment (qa by default)
const CLOUD_SECRETS_FILE = Path.join(Os.homedir(), '.elastic/cloud.json');
const getEnvironment = () => process.env.EC_ENV ?? 'qa';

const ROLES_BY_ARCH: Record<DoctorArch, string[]> = {
  stateful: ['editor', 'viewer'],
  serverless: ['viewer', ...new Set(PROJECT_DEFAULT_ROLES.values())],
};

// Direct Scout runs read these; QAF writes them for a run and refuses to run when they exist
const SCOUT_CLOUD_CONFIGS: Record<DoctorArch, string> = {
  stateful: '.scout/servers/cloud_ech.json',
  serverless: '.scout/servers/cloud_mki.json',
};
const SCOUT_ROLE_USERS_FILE = '.scout/role_users.json';
// FTR Cloud runs read users from here, in the same format
const FTR_ROLE_USERS_FILE = '.ftr/role_users.json';

type Users = Record<string, { email?: string; password?: string } | undefined>;

interface CloudSecrets {
  api_key?: Record<string, string>;
  role_credentials?: Record<string, Users>;
}

const readJson = async <T>(path: string): Promise<T | undefined> => {
  const content = await Fs.promises.readFile(path, 'utf8').catch(() => undefined);
  return content === undefined ? undefined : JSON.parse(content);
};

const existsInRepo = (file: string) => Fs.existsSync(Path.resolve(REPO_ROOT, file));

const displayPath = (path: string) =>
  path.startsWith(REPO_ROOT) ? Path.relative(REPO_ROOT, path) : tildify(path);

const getDefinedRoles = (users: Users) =>
  Object.keys(users).filter((role) => users[role]?.email && users[role]?.password);

const quoteRoles = (roles: string[]) => roles.map((role) => `"${role}"`).join(', ');

/** Checks users by role, e.g. "Cloud users" in ~/.elastic/cloud.json (qa) */
const checkUsers = (
  { label, file }: { label: string; file?: string },
  users: Users,
  expected: string[],
  copyFix?: Fix
): CheckResult => {
  const roles = [...new Set(expected)];
  const defined = getDefinedRoles(users);
  const missing = roles.filter((role) => !defined.includes(role));
  const inFile = file ? ` in ${file}` : '';
  const remedy = copyFix
    ? { fix: copyFix, hint: `copy them only if they are ${getEnvironment()} users` }
    : { hint: `tests that log in as ${missing.join(' or ')} will fail` };
  if (!missing.length) {
    return pass(`${label} are defined${inFile}: ${quoteRoles(roles)}`);
  }

  const message = `Missing ${label}${inFile} for roles: ${quoteRoles(missing)}`;
  return missing.includes('admin') ? fail(message, remedy) : warn(message, remedy);
};

const readCloudUsers = async () =>
  (await readJson<CloudSecrets>(CLOUD_SECRETS_FILE))?.role_credentials?.[getEnvironment()] ?? {};

/** Copies users from the FTR users file when it has some of the expected roles QAF is missing */
const getCopyFtrUsersFix = async (expected: string[]): Promise<Fix | undefined> => {
  const ftrUsers = await readJson<Users>(Path.resolve(REPO_ROOT, FTR_ROLE_USERS_FILE));
  const cloudRoles = getDefinedRoles(await readCloudUsers());
  // copy every role QAF is missing, so all checks suggest the same command
  const roles = getDefinedRoles(ftrUsers ?? {}).filter((role) => !cloudRoles.includes(role));
  if (!ftrUsers || !roles.some((role) => expected.includes(role))) {
    return undefined;
  }

  const env = getEnvironment();
  return {
    command: `copy ${roles.join(
      ', '
    )} from ${FTR_ROLE_USERS_FILE} to role_credentials.${env} in ${tildify(CLOUD_SECRETS_FILE)}`,
    destructive: true,
    run: async () => {
      const secrets = (await readJson<CloudSecrets>(CLOUD_SECRETS_FILE)) ?? {};
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

const cloudUsersCheck: DoctorCheck = {
  title: 'Cloud users',
  run: async () => {
    const env = getEnvironment();
    const copyFix = await getCopyFtrUsersFix(['admin']);
    if (!Fs.existsSync(CLOUD_SECRETS_FILE)) {
      return fail(
        `${tildify(CLOUD_SECRETS_FILE)} does not exist`,
        copyFix
          ? { fix: copyFix, hint: `copy them only if they are ${env} users` }
          : { hint: `add Cloud users under role_credentials.${env}` }
      );
    }
    return checkUsers(
      { label: 'Cloud users', file: `${tildify(CLOUD_SECRETS_FILE)} (${env})` },
      await readCloudUsers(),
      ['admin'],
      copyFix
    );
  },
};

const cloudRolesCheck = (arch: DoctorArch): DoctorCheck => ({
  title: 'Cloud users',
  arch,
  dependsOn: cloudUsersCheck,
  run: async () =>
    checkUsers(
      { label: 'Cloud users' },
      await readCloudUsers(),
      ROLES_BY_ARCH[arch],
      await getCopyFtrUsersFix(ROLES_BY_ARCH[arch])
    ),
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
  arch,
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
const scoutUsersCheck = (arch: DoctorArch, configCheck: DoctorCheck): DoctorCheck => ({
  title: `Scout Cloud users for ${SCOUT_CLOUD_CONFIGS[arch]}`,
  arch,
  dependsOn: configCheck,
  run: async () => {
    const configFile = SCOUT_CLOUD_CONFIGS[arch];
    const config = await readJson<{ cloudUsersFilePath: string; projectType?: string }>(
      Path.resolve(REPO_ROOT, configFile)
    );
    // Scout resolves it against the working directory, which is the repo root
    const usersFile = Path.resolve(REPO_ROOT, config?.cloudUsersFilePath ?? '');
    const users = await readJson<Users>(usersFile);
    if (!users) {
      return fail(`${displayPath(usersFile)} does not exist`, {
        hint: `${configFile} reads Cloud users from it`,
      });
    }

    const projectRole = config?.projectType && PROJECT_DEFAULT_ROLES.get(config.projectType);
    const expected =
      arch === 'stateful'
        ? ['admin', ...ROLES_BY_ARCH.stateful]
        : ['admin', 'viewer', ...(projectRole ? [projectRole] : [])];
    return checkUsers(
      { label: 'Scout Cloud users', file: displayPath(usersFile) },
      users,
      expected
    );
  },
});

const qafRunFileCheck = (file: string, arch?: DoctorArch): DoctorCheck => ({
  title: 'Files that block QAF runs',
  arch,
  run: async () =>
    warn(`QAF won't run while ${file} exists`, {
      hint: 'direct Scout runs use it, remove it to run with QAF',
      fix: { command: `rm -f ${file}`, destructive: true },
    }),
});

const getQafRunFileChecks = (): DoctorCheck[] => {
  const checks = [
    ...(existsInRepo(SCOUT_ROLE_USERS_FILE) ? [qafRunFileCheck(SCOUT_ROLE_USERS_FILE)] : []),
    ...DOCTOR_ARCHS.filter((arch) => existsInRepo(SCOUT_CLOUD_CONFIGS[arch])).map((arch) =>
      qafRunFileCheck(SCOUT_CLOUD_CONFIGS[arch], arch)
    ),
  ];
  return checks.length
    ? checks
    : [
        {
          title: 'Files that block QAF runs',
          run: async () => pass('No files that block QAF runs'),
        },
      ];
};

export const getElasticCloudChecks = (): DoctorCheck[] => [
  apiKeyCheck,
  cloudUsersCheck,
  ...DOCTOR_ARCHS.map(cloudRolesCheck),
  ...DOCTOR_ARCHS.filter((arch) => existsInRepo(SCOUT_CLOUD_CONFIGS[arch])).flatMap((arch) => {
    const configCheck = scoutConfigCheck(arch);
    return [configCheck, scoutUsersCheck(arch, configCheck)];
  }),
  ...getQafRunFileChecks(),
];
