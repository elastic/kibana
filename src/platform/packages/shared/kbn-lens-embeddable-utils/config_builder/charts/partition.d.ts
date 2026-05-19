import type { BuildDependencies, LensAttributes, LensPieConfig, LensTreeMapConfig } from '../types';
export declare function buildPartitionChart(config: LensTreeMapConfig | LensPieConfig, { dataViewsAPI }: BuildDependencies): Promise<LensAttributes>;
