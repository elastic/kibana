import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { StartServicesAccessor } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';
import type { DataViewsServerPluginStartDependencies, DataViewsServerPluginStart } from './types';
export declare const minMaxAvgLoC: (scripts: Array<string | undefined>) => {
    min: number;
    max: number;
    avg: number;
};
export declare const updateMin: (currentMin: number | undefined, newVal: number) => number;
export declare const updateMax: (currentMax: number | undefined, newVal: number) => number;
export declare function getIndexPatternTelemetry(savedObjectsService: SavedObjectsClient): Promise<{
    indexPatternsCount: number;
    indexPatternsWithScriptedFieldCount: number;
    indexPatternsWithRuntimeFieldCount: number;
    scriptedFieldCount: number;
    runtimeFieldCount: number;
    perIndexPattern: {
        scriptedFieldCount: {
            min?: number;
            max?: number;
            avg?: number;
        };
        runtimeFieldCount: {
            min?: number;
            max?: number;
            avg?: number;
        };
        scriptedFieldLineCount: {
            min?: number;
            max?: number;
            avg?: number;
        };
        runtimeFieldLineCount: {
            min?: number;
            max?: number;
            avg?: number;
        };
    };
}>;
export declare function registerIndexPatternsUsageCollector(getStartServices: StartServicesAccessor<DataViewsServerPluginStartDependencies, DataViewsServerPluginStart>, usageCollection?: UsageCollectionSetup): void;
