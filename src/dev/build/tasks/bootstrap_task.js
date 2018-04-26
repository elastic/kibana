import { exec } from '../lib';

export const BootstrapTask = {
  global: true,
  description: 'Running `yarn kbn bootstrap` to make sure all dependencies are up-to-date',

  async run(config, log) {
    await exec(log, 'yarn', ['kbn', 'bootstrap', '--skip-kibana-extra']);
  },
};
