import { runFpm } from './run_fpm';

export const CreateDebPackageTask = {
  description: 'Creating deb package',

  async run(config, log, build) {
    await runFpm(config, log, build, 'deb', [
      '--architecture', 'amd64',
      '--deb-priority', 'optional'
    ]);
  }
};

export const CreateRpmPackageTask = {
  description: 'Creating rpm package',

  async run(config, log, build) {
    await runFpm(config, log, build, 'rpm', [
      '--architecture', 'x86_64',
      '--rpm-os', 'linux'
    ]);
  }
};
