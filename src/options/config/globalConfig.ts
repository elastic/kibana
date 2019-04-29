import { readConfigFile } from './readConfigFile';
import { mkdirp, chmod, writeFile } from '../../services/rpc';
import { getGlobalConfigPath, getReposPath } from '../../services/env';

interface GlobalConfig {
  username?: string;
  accessToken?: string;
  prDescription?: string;

  // the following are overwritable by project config:
  all?: boolean;
  multiple?: boolean;
  multipleCommits?: boolean;
  multipleBranches?: boolean;
}

export async function getGlobalConfig() {
  await maybeCreateGlobalConfigAndFolder();

  const globalConfigPath = getGlobalConfigPath();
  return readConfigFile<GlobalConfig>(globalConfigPath);
}

export async function maybeCreateGlobalConfigAndFolder() {
  const reposPath = getReposPath();
  const globalConfigPath = getGlobalConfigPath();
  const configTemplate = await getConfigTemplate();
  await mkdirp(reposPath);
  const didCreate = await maybeCreateGlobalConfig(
    globalConfigPath,
    configTemplate
  );
  await ensureCorrectPermissions(globalConfigPath);
  return didCreate;
}

function ensureCorrectPermissions(globalConfigPath: string) {
  return chmod(globalConfigPath, '600');
}

export async function maybeCreateGlobalConfig(
  globalConfigPath: string,
  configTemplate: string
) {
  try {
    await writeFile(globalConfigPath, configTemplate, {
      flag: 'wx', // create and write file. Error if it already exists
      mode: 0o600 // give the owner read-write privleges, no access for others
    });
    return true;
  } catch (e) {
    const FILE_ALREADY_EXISTS = 'EEXIST';
    if (e.code !== FILE_ALREADY_EXISTS) {
      throw e;
    }
    return false;
  }
}

function getConfigTemplate() {
  return `{
    // Github personal access token. Must be created here: https://github.com/settings/tokens/new
    // Must have "Repo: Full control of private repositories"
    "accessToken": "",

    // Github username, eg. kimchy
    "username": ""
  }`;
}
