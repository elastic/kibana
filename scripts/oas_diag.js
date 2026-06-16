require('../src/setup_node_env');

(async () => {
  const {
    createRootWithCorePlugins,
  } = require('@kbn/core-test-helpers-kbn-server');
  const { set } = require('@kbn/safer-lodash-set');
  const {
    PLUGIN_SYSTEM_ENABLE_ALL_PLUGINS_CONFIG_PATH,
  } = require('@kbn/core-plugins-server-internal/src/constants');

  const settings = {
    logging: { loggers: [{ name: 'root', level: 'error', appenders: ['console'] }] },
    server: { port: 5622, oas: { enabled: true } },
  };
  set(settings, PLUGIN_SYSTEM_ENABLE_ALL_PLUGINS_CONFIG_PATH, true);
  set(settings, 'migrations.skip', true);
  set(settings, 'dataStreams.migrations.skip', true);
  set(settings, 'elasticsearch.skipStartupConnectionCheck', true);

  const cliArgs = {
    serverless: false,
    basePath: false,
    cache: false,
    dev: true,
    disableOptimizer: true,
    silent: false,
    dist: false,
    oss: false,
    runExamples: false,
    watch: false,
  };

  const root = createRootWithCorePlugins(settings, cliArgs);
  await root.preboot();
  await root.setup();
  const { http } = await root.start();

  const publicOas = await http.generateOas({
    baseUrl: 'http://localhost:5622',
    filters: { access: 'public', version: '2023-10-31' },
  });
  const internalOas = await http.generateOas({
    baseUrl: 'http://localhost:5622',
    filters: { access: 'internal' },
  });

  // eslint-disable-next-line no-console
  console.error(
    JSON.stringify(
      {
        publicPathCount: Object.keys(publicOas.paths || {}).length,
        internalPathCount: Object.keys(internalOas.paths || {}).length,
        somePublicPaths: Object.keys(publicOas.paths || {}).slice(0, 5),
        someInternalPaths: Object.keys(internalOas.paths || {}).slice(0, 5),
      },
      null,
      2
    )
  );
  process.exit(0);
})().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('DIAG ERROR', e);
  process.exit(1);
});
