import type { BuildDependencies, LensAttributes, LensTagCloudConfig } from '../types';
export declare function buildTagCloud(config: LensTagCloudConfig, { dataViewsAPI }: BuildDependencies): Promise<LensAttributes>;
