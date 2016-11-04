import { accessSync, R_OK } from 'fs';
import { find } from 'lodash';
import { fromRoot } from '../../utils';

const CONFIG_PATHS = [
  process.env.CONFIG_PATH,
  fromRoot('config/kibana.yml'),
  '/etc/kibana/kibana.yml'
].filter(Boolean);

const DATA_PATHS = [
  process.env.DATA_PATH,
  fromRoot('data'),
  '/var/lib/kibana'
].filter(Boolean);

function findFile(paths) {
  const availablePath = find(paths, configPath => {
    try {
      accessSync(configPath, R_OK);
      return true;
    } catch (e) {
      //Check the next path
    }
  });
  return availablePath || paths[0];
}

export default {
  getConfig: () => findFile(CONFIG_PATHS),
  getData: () => findFile(DATA_PATHS)
};
