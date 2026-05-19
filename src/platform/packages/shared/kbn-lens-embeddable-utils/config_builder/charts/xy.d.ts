import type { BuildDependencies, LensAttributes, LensXYConfig } from '../types';
export declare function buildXY(config: LensXYConfig, { dataViewsAPI }: BuildDependencies): Promise<LensAttributes>;
