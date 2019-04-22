import { getGlobalConfigPath } from '../services/env';
import { maybeCreateGlobalConfigAndFolder } from '../options/config/globalConfig';

export async function postinstall() {
  try {
    const didCreate = await maybeCreateGlobalConfigAndFolder();
    if (didCreate) {
      const GLOBAL_CONFIG_PATH = getGlobalConfigPath();
      console.log(
        `Global config successfully created in ${GLOBAL_CONFIG_PATH}`
      );
    }
  } catch (e) {
    console.error('Global config could not be created', e);
  }
}
