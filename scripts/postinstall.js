try {
  const { getGlobalConfigPath } = require('../dist/lib/env');
  const { maybeCreateGlobalConfigAndFolder } = require('../dist/lib/configs');

  maybeCreateGlobalConfigAndFolder()
    .then(() => {
      const GLOBAL_CONFIG_PATH = getGlobalConfigPath();
      console.log(
        `Global config successfully created in ${GLOBAL_CONFIG_PATH}`
      );
    })
    .catch(e => {
      console.error('Could not create global config', e);
    });
} catch (e) {
  if (e.code !== 'MODULE_NOT_FOUND') {
    throw e;
  }
}
