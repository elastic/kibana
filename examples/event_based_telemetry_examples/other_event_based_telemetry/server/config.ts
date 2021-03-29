import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  temp_ticker_interval_ms: schema.maybe(schema.number({ defaultValue: 100 })),
});

export type EventBasedTelemetryExampleConfigType = TypeOf<typeof configSchema>;
