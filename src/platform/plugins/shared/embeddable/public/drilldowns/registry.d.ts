import type { DrilldownDefinition } from './types';
export declare function registerDrilldown(type: string, getFn: () => Promise<DrilldownDefinition<any, any, any>>): void;
export declare function getDrilldown(type: string): Promise<DrilldownDefinition<any, any, any>>;
export declare function hasDrilldown(type: string): boolean;
export declare function getDrilldownRegistryEntries(): [string, () => Promise<DrilldownDefinition<any, any, any>>][];
