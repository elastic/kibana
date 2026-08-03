import type { BuildDependencies, LensAttributes, LensHeatmapConfig } from '../types';
export declare function buildHeatmap(config: LensHeatmapConfig, { dataViewsAPI }: BuildDependencies): Promise<LensAttributes>;
