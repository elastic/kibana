import type { Logger, IRouter, StartServicesAccessor } from 'kibana/server';
import type { EventBasedTelemetryPluginDepsStart } from '../types';
import { defineGetExampleRoute } from './get_example';
import { defineRemoteTelemetryServiceMockRoute } from './remote_telemetry_service_mock';

export function defineRoutes(
  logger: Logger,
  router: IRouter,
  getStartServices: StartServicesAccessor<EventBasedTelemetryPluginDepsStart>
) {
  defineGetExampleRoute(router, getStartServices);
  defineRemoteTelemetryServiceMockRoute(logger, router);
}
