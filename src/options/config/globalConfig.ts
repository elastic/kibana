import makeDir from 'make-dir';
import { getGlobalConfigPath, getReposPath } from '../../services/env';
import { chmod, writeFile } from '../../services/fs-promisified';
import { ConfigFileOptions } from '../ConfigOptions';
import { readConfigFile } from './readConfigFile';

export async function getGlobalConfig(
  ci?: boolean
): Promise<ConfigFileOptions | undefined> {
  // don't attempt to fetch global config in ci environment
  if (ci) {
    return;
  }

  await createGlobalConfigAndFolderIfNotExist();
  const globalConfigPath = getGlobalConfigPath();
  return readConfigFile(globalConfigPath);
}

export async function createGlobalConfigAndFolderIfNotExist() {
  const reposPath = getReposPath();
  const globalConfigPath = getGlobalConfigPath();
  const configTemplate = getConfigTemplate();
  await makeDir(reposPath);
  const didCreate = await createGlobalConfigIfNotExist(
    globalConfigPath,
    configTemplate
  );
  await ensureCorrectPermissions(globalConfigPath);
  return didCreate;
}

function ensureCorrectPermissions(globalConfigPath: string) {
  return chmod(globalConfigPath, '600');
}

export async function createGlobalConfigIfNotExist(
  globalConfigPath: string,
  configTemplate: string
) {
  try {
    await writeFile(globalConfigPath, configTemplate, {
      flag: 'wx', // create and write file. Error if it already exists
      mode: 0o600, // give the owner read-write privleges, no access for others
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
    "accessToken": ""
  }`;
}
