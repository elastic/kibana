import type { BuildDependencies, LensAttributes, LensGaugeConfig } from '../types';
export declare function buildGauge(config: LensGaugeConfig, { dataViewsAPI }: BuildDependencies): Promise<LensAttributes>;
