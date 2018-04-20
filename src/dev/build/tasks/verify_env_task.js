export const VerifyEnvTask = {
  global: true,
  description: 'Verifying environment meets requirements',

  async run(config, log) {
    const version = `v${config.getNodeVersion()}`;

    if (version !== process.version) {
      throw new Error(`Invalid nodejs version, please use ${version}`);
    }

    log.success('Node.js version verified');
  },
};
