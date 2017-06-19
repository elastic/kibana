import { readFileSync } from 'fs';
import { safeLoad } from 'js-yaml';

const readYaml = (path: string) =>
  safeLoad(readFileSync(path, 'utf8'));

export function getRawConfig(configFile: string | undefined, defaultConfigFile: string) {
  const file = configFile === undefined
    ? defaultConfigFile
    : configFile;

  return file === undefined
    ? {}
    : readYaml(file);
}
