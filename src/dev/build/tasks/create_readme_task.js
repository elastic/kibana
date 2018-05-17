import { write, read } from '../lib';

export const CreateReadmeTask = {
  description: 'Creating README.md file',

  async run(config, log, build) {
    const readme = await read(config.resolveFromRepo('README.md'));

    await write(
      build.resolvePath('README.txt'),
      readme.replace(/\s##\sSnapshot\sBuilds[\s\S]*/, '')
    );
  },
};
