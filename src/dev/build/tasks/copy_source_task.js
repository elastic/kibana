import { copyAll } from '../lib';

export const CopySourceTask = {
  description: 'Copying source into platform-generic build directory',

  async run(config, log, build) {
    await copyAll(config.resolveFromRepo(), build.resolvePath(), {
      dot: false,
      select: [
        'yarn.lock',
        'src/**',
        '!src/**/__tests__/**',
        '!src/test_utils/**',
        '!src/fixtures/**',
        '!src/core_plugins/dev_mode/**',
        '!src/core_plugins/tests_bundle/**',
        '!src/core_plugins/testbed/**',
        '!src/core_plugins/console/public/tests/**',
        '!src/cli/cluster/**',
        '!src/es_archiver/**',
        '!src/functional_test_runner/**',
        '!src/dev/**',
        'bin/**',
        'webpackShims/**',
        'config/kibana.yml',
      ],
    });
  },
};
