import { readFileSync } from 'fs';
import { safeLoad } from 'js-yaml';

import { ensureDeepObject } from './ensureDeepObject';

const readYaml = (path: string) => safeLoad(readFileSync(path, 'utf8'));

export const getConfigFromFile = (configFile: string) => {
  const yaml = readYaml(configFile);
  return yaml == null ? yaml : ensureDeepObject(yaml);
};
