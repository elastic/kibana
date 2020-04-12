import { createGlobalConfigAndFolderIfNotExist } from '../options/config/globalConfig';
import { getGlobalConfigPath } from '../services/env';
import { consoleLog } from '../services/logger';

export async function postinstall() {
  try {
    const didCreate = await createGlobalConfigAndFolderIfNotExist();
    if (didCreate) {
      const GLOBAL_CONFIG_PATH = getGlobalConfigPath();
      consoleLog(`Global config successfully created in ${GLOBAL_CONFIG_PATH}`);
    }
  } catch (e) {
    consoleLog(`Global config could not be created:\n${e.stack}`);
  }
}
