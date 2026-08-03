import type { DrilldownRegistryEntry } from '../types';
import type { DrilldownFactory } from './types';
export declare function getCompatibleFactories(entries: DrilldownRegistryEntry[], context: object, triggers: string[]): Promise<DrilldownFactory[]>;
