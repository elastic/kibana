import findUp from 'find-up';
import { ConfigFileOptions } from '../ConfigOptions';
import { readConfigFile } from '../config/readConfigFile';

export async function getProjectConfig(): Promise<
  ConfigFileOptions | undefined
> {
  const filepath = await findUp('.backportrc.json');
  if (!filepath) {
    return;
  }

  return readConfigFile(filepath);
}
