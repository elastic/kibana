import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'kibana/server';

import { timer } from 'rxjs';
import type {
  EventBasedTelemetryPluginSetup,
  EventBasedTelemetryPluginStart,
  EventBasedTelemetryPluginDepsSetup,
  EventBasedTelemetryPluginDepsStart,
} from './types';
import { EventBasedTelemetryExampleConfigType } from './config';

export class EventBasedTelemetryPlugin
  implements Plugin<EventBasedTelemetryPluginSetup, EventBasedTelemetryPluginStart> {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<EventBasedTelemetryPluginDepsStart>,
    { telemetry }: EventBasedTelemetryPluginDepsSetup
  ) {
    telemetry?.events.registerChannel({
      name: 'temp-ticker',
      schema: {
        now: {
          type: 'date',
          _meta: { description: 'The date as seen by the server' },
        },
        kibana: {
          properties: {
            uuid: {
              type: 'keyword',
              _meta: {
                description:
                  "The Kibana UUID. Used in this example only to make the event large enough so we don't need to wait ages for the leaky-bucket to kick in",
              },
            },
          },
        },
      },
    });

    return {};
  }

  public start(core: CoreStart, { telemetry }: EventBasedTelemetryPluginDepsStart) {
    const tickerInterval = this.initializerContext.config.get<EventBasedTelemetryExampleConfigType>()
      .temp_ticker_interval_ms;
    if (tickerInterval) {
      timer(0, tickerInterval).subscribe(() => {
        telemetry?.events.sendToChannel('temp-ticker', [
          {
            now: new Date().toISOString(),
            kibana: { uuid: this.initializerContext.env.instanceUuid },
          },
        ]);
      });
    }

    return {};
  }

  public stop() {}
}
