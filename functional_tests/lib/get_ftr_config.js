import { readFtrConfigFile } from '@kbn/plugin-helpers';

import { FTR_CONFIG_PATH } from './paths';
import { log } from './log';

export async function getFtrConfig() {
  return await readFtrConfigFile(log, FTR_CONFIG_PATH);
}
