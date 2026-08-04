import type { BuildDependencies, LensAttributes, LensRegionMapConfig } from '../types';
export declare function buildRegionMap(config: LensRegionMapConfig, { dataViewsAPI }: BuildDependencies): Promise<LensAttributes>;
