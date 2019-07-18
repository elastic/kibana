import makeDir from 'make-dir';
import { chmod, writeFile } from '../../services/fs-promisified';
import { getGlobalConfigPath, getReposPath } from '../../services/env';
import { readConfigFile } from './readConfigFile';

export async function getGlobalConfig() {
  await maybeCreateGlobalConfigAndFolder();
  const globalConfigPath = getGlobalConfigPath();
  return readConfigFile(globalConfigPath);
}

export async function maybeCreateGlobalConfigAndFolder() {
  const reposPath = getReposPath();
  const globalConfigPath = getGlobalConfigPath();
  const configTemplate = await getConfigTemplate();
  await makeDir(reposPath);
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
