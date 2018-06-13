const { getGlobalConfigPath } = require('../src/lib/env');
const { maybeCreateGlobalConfigAndFolder } = require('../src/lib/configs');

maybeCreateGlobalConfigAndFolder()
  .then(() => {
    const GLOBAL_CONFIG_PATH = getGlobalConfigPath();
    console.log(`Global config successfully created in ${GLOBAL_CONFIG_PATH}`);
  })
  .catch(e => {
    console.error('Could not create global config', e);
  });
