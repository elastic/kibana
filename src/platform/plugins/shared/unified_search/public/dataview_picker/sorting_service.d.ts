import type { Direction } from '@elastic/eui';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
export declare const ALPHABETICALLY = "alphabetically";
export interface Sorting {
    sortingStrategyType: typeof ALPHABETICALLY;
    direction: Direction;
}
export declare class SortingService<T = unknown> {
    private sortingStrategies;
    private storage;
    sortingStrategyType: Sorting['sortingStrategyType'];
    direction: Sorting['direction'];
    constructor(sortingStrategies: Record<Sorting['sortingStrategyType'], (arg: T) => string>, storage?: IStorageWrapper);
    private getSorting;
    setDirection(direction: Sorting['direction']): void;
    setSortingStrategyType(sortingStrategyType: Sorting['sortingStrategyType']): void;
    getOrderDirections(): Array<Sorting['direction']>;
    getSortingStrategyTypes(): Array<Sorting['sortingStrategyType']>;
    sortData(data: T[]): T[];
    private compare;
}
