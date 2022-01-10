import makeDir from 'make-dir';
import { getBackportDirPath, getGlobalConfigPath } from '../../services/env';
import { chmod, writeFile } from '../../services/fs-promisified';
import { ConfigFileOptions } from '../ConfigOptions';
import { readConfigFile } from './readConfigFile';

export async function getGlobalConfig(): Promise<ConfigFileOptions> {
  await createGlobalConfigAndFolderIfNotExist();
  const globalConfigPath = getGlobalConfigPath();
  return readConfigFile(globalConfigPath);
}

export async function createGlobalConfigAndFolderIfNotExist() {
  // create .backport folder
  await makeDir(getBackportDirPath());

  const globalConfigPath = getGlobalConfigPath();
  const configTemplate = getConfigTemplate();
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
    // Create a personal access token here: https://github.com/settings/tokens
    // Must have "Repo: Full control of private repositories"
    "accessToken": ""
  }`;
}
