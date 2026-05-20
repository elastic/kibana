import type { BuildDependencies, LensAttributes, LensMetricConfig } from '../types';
export declare function buildMetric(config: LensMetricConfig, { dataViewsAPI }: BuildDependencies): Promise<LensAttributes>;
