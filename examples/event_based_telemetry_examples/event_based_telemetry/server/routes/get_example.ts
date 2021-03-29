import { IRouter, StartServicesAccessor } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import { EventBasedTelemetryPluginDepsStart } from '../types';

export function defineGetExampleRoute(
  router: IRouter,
  getStartServices: StartServicesAccessor<EventBasedTelemetryPluginDepsStart>
) {
  router.get(
    {
      path: '/api/event_based_telemetry/example',
      validate: {
        query: schema.object({
          invalid: schema.boolean({ defaultValue: false }),
        }),
      },
    },
    async (context, request, response) => {
      const userAgent = request.headers['user-agent'];
      getStartServices().then(([core, { telemetry }]) => {
        if (request.query.invalid) {
          telemetry?.events.sendToChannel('user-agents', [{ invalid_event: 1234 }]);
        } else {
          telemetry?.events.sendToChannel(
            'user-agents',
            new Array(100).fill({ user_agent: userAgent })
          );
        }
      });
      return response.ok({
        body: {
          time: new Date().toISOString(),
          userAgent,
        },
      });
    }
  );
}
