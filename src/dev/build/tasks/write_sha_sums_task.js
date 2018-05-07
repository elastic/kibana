import globby from 'globby';

import { getFileHash, write } from '../lib';

export const WriteShaSumsTask = {
  global: true,
  description: 'Writing sha1sums of archives and packages in target directory',

  async run(config) {
    const artifacts = await globby(['*.zip', '*.tar.gz', '*.deb', '*.rpm'], {
      cwd: config.resolveFromTarget('.'),
      absolute: true,
    });

    for (const artifact of artifacts) {
      await write(
        `${artifact}.sha1.txt`,
        await getFileHash(artifact, 'sha1')
      );
    }
  }
};
