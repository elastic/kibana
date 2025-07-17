import { schema } from '@kbn/config-schema';
import { metricStateSchema } from './charts/metric';

const lensApiStateSchema = schema.oneOf([
    metricStateSchema,
]);

export type LensApiState = typeof lensApiStateSchema.type;

export type { MetricState } from './charts/metric';

export type NarrowByType<T, U> = T extends { type: U } ? T : never;