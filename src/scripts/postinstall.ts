import { createGlobalConfigAndFolderIfNotExist } from '../options/config/globalConfig';
import { getGlobalConfigPath } from '../services/env';
import { consoleLog } from '../services/logger';

export async function postinstall() {
  try {
    const globalConfigPath = getGlobalConfigPath();
    const didCreate = await createGlobalConfigAndFolderIfNotExist(
      globalConfigPath
    );
    if (didCreate) {
      consoleLog(`Global config successfully created in ${globalConfigPath}`);
    }
  } catch (e) {
    consoleLog(`Global config could not be created:\n${e.stack}`);
  }
}
