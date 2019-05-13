import findUp from 'find-up';
import { readConfigFile } from '../config/readConfigFile';

export async function getProjectConfig() {
  const filepath = await findUp('.backportrc.json');
  if (!filepath) {
    return {};
  }

  return readConfigFile(filepath);
}
