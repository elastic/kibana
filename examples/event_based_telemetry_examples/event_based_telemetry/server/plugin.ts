import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from 'kibana/server';

import { timer } from 'rxjs';
import type { TelemetryPluginSetup } from 'src/plugins/telemetry/server';
import type {
  EventBasedTelemetryPluginSetup,
  EventBasedTelemetryPluginStart,
  EventBasedTelemetryPluginDepsSetup,
  EventBasedTelemetryPluginDepsStart,
} from './types';
import { defineRoutes } from './routes';
import type { EventBasedTelemetryExampleConfigType } from './config';

export class EventBasedTelemetryPlugin
  implements Plugin<EventBasedTelemetryPluginSetup, EventBasedTelemetryPluginStart> {
  private readonly logger: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup<EventBasedTelemetryPluginDepsStart>,
    { telemetry }: EventBasedTelemetryPluginDepsSetup
  ) {
    this.logger.debug('eventBasedTelemetry: Setup');
    const router = core.http.createRouter();

    this.registerEventTelemetryChannels(telemetry);

    // Register server side APIs
    defineRoutes(this.logger.get('http'), router, core.getStartServices);

    return {};
  }

  public start(core: CoreStart, { telemetry }: EventBasedTelemetryPluginDepsStart) {
    this.logger.debug('eventBasedTelemetry: Started');

    const tickerInterval = this.initializerContext.config.get<EventBasedTelemetryExampleConfigType>()
      .temp_ticker_interval_ms;

    if (tickerInterval) {
      timer(0, tickerInterval).subscribe(() => {
        telemetry?.events.sendToChannel('temp-ticker', [{ now: new Date().toISOString() }]);
      });
    }

    return {};
  }

  public stop() {}

  private registerEventTelemetryChannels(telemetry?: TelemetryPluginSetup) {
    telemetry?.events.registerChannel({
      name: 'user-agents',
      schema: {
        user_agent: {
          type: 'keyword',
          _meta: { description: 'The user agent as seen in the API headers' },
        },
      },
    });

    telemetry?.events.registerChannel({
      name: 'temp-ticker',
      schema: {
        now: {
          type: 'date',
          _meta: { description: 'The date as seen by the server' },
        },
      },
      quotaPercentage: this.initializerContext.config.get<EventBasedTelemetryExampleConfigType>()
        .temp_ticker_quota_percentage,
    });
  }
}
