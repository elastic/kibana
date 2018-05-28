import { exec } from '../lib';

export const TranspileTypescriptTask = {
  description: 'Transpiling sources with typescript compiler',

  async run(config, log, build) {
    await exec(
      log,
      require.resolve('typescript/bin/tsc'),
      [
        '--pretty', 'true'
      ],
      {
        cwd: build.resolvePath(),
      }
    );
  },
};
