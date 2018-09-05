import { routes } from './server/routes';
import { functionsRegistry } from './common/lib/functions_registry';
import { commonFunctions } from './common/functions';
import { loadServerPlugins } from './server/lib/load_server_plugins';
import { registerCanvasUsageCollector } from './server/usage';

export default function(server /*options*/) {
  server.injectUiAppVars('canvas', () => {
    const config = server.config();
    const basePath = config.get('server.basePath');
    const reportingBrowserType = config.get('xpack.reporting.capture.browser.type');

    return {
      kbnIndex: config.get('kibana.index'),
      esShardTimeout: config.get('elasticsearch.shardTimeout'),
      esApiVersion: config.get('elasticsearch.apiVersion'),
      serverFunctions: functionsRegistry.toArray(),
      basePath,
      reportingBrowserType,
    };
  });

  // There are some common functions that use private APIs, load them here
  commonFunctions.forEach(func => functionsRegistry.register(func));

  loadServerPlugins().then(() => routes(server));
  registerCanvasUsageCollector(server);
}
