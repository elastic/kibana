import type { BuildDependencies, LensAttributes, LensTableConfig } from '../types';
export declare function buildTable(config: LensTableConfig, { dataViewsAPI }: BuildDependencies): Promise<LensAttributes>;
