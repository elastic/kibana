import type { IndexTypesMap } from '@kbn/core-saved-objects-base-server-internal';
import type { IndexMap } from './core';
import { type TypeStatusDetails } from './kibana_migrator_constants';
declare class Defer<T> {
    resolve: (data?: T) => void;
    reject: (error: any) => void;
    promise: Promise<any>;
}
export type WaitGroup<T> = Defer<T>;
export declare function waitGroup<T>(): WaitGroup<T>;
export declare function createWaitGroupMap<T>(keys: string[]): Record<string, WaitGroup<T>>;
export declare function getIndicesInvolvedInRelocation(currentIndexTypesMap: IndexTypesMap, desiredIndexTypesMap: IndexTypesMap): string[];
export declare function indexMapToIndexTypesMap(indexMap: IndexMap): IndexTypesMap;
export declare function calculateTypeStatuses(currentIndexTypesMap: IndexTypesMap, desiredIndexTypesMap: IndexTypesMap): Record<string, TypeStatusDetails>;
export {};
