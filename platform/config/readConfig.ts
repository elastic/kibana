import { readFileSync } from 'fs';
import { safeLoad } from 'js-yaml';

const readYaml = (path: string) =>
  safeLoad(readFileSync(path, 'utf8'));

export const getConfigFromFile = (configFile: string) =>
  readYaml(configFile);
