import gulpBabel from 'gulp-babel';
import vfs from 'vinyl-fs';

import { createPromiseFromStreams } from '../../../utils';

export const TranspileSourceTask = {
  description: 'Transpiling sources with babel',

  async run(config, log, build) {
    await createPromiseFromStreams([
      vfs.src(
        [
          '**/*.js',
          '!packages/**',
          '!**/public/**',
          '!**/node_modules/**',
          '!**/bower_components/**',
          '!**/__tests__/**',
        ],
        {
          cwd: build.resolvePath(),
        }
      ),

      gulpBabel({
        babelrc: false,
        presets: [require.resolve('@kbn/babel-preset/node_preset')],
      }),

      vfs.dest(build.resolvePath()),
    ]);
  },
};
