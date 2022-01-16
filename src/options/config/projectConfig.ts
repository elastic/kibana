import path from 'path/posix';
import findUp from 'find-up';
import { ConfigFileOptions } from '../ConfigOptions';
import { readConfigFile } from '../config/readConfigFile';

export async function getProjectConfig({
  configFile,
}: {
  configFile: string | undefined;
}): Promise<ConfigFileOptions | undefined> {
  const filepath = configFile
    ? path.resolve(configFile)
    : await findUp('.backportrc.json');

  if (!filepath) {
    return;
  }

  return readConfigFile(filepath);
}
