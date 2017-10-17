import { KibanaPluginConfig } from 'kbn-types';
import { PortDashboardsService } from './PortDashboardsService';
import { registerEndpoints } from './registerEndpoints';

export const plugin: KibanaPluginConfig<{}> = {
  plugin: (kibana, dependencies) => {
    const {
      kibana: _kibana,
      elasticsearch,
      logger,
      util,
      http,
      config, // TODO: is config exposed?
      SavedObjectsService,
    } = kibana;

    // example of creating a logger with a context
    const log = logger.get('portDashboardsService');

    log.info('creating portDashboards plugin');

    const router = http.createAndRegisterRouter('/api/dashboards');

    // what we pass into registerEndpoints
    // is actually available in the endpoint def
    // as well as the handler function for the
    // route
    registerEndpoints(router, logger, util.schema, config, SavedObjectsService, elasticsearch);
  }
};
