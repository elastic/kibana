import { mkdirp, write } from '../lib';

export const CreateEmptyDirsAndFilesTask = {
  description: 'Creating some empty directories and files to prevent file-permission issues',

  async run(config, log, build) {
    await Promise.all([
      mkdirp(build.resolvePath('plugins')),
      mkdirp(build.resolvePath('data')),
      write(build.resolvePath('optimize/.babelcache.json'), '{}'),
    ]);
  },
};
