import type { PublicMethodsOf } from '@kbn/utility-types';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { TimeRange } from '@kbn/es-query';
export declare class TimeHistory {
    private history;
    constructor(storage: IStorageWrapper);
    add(time: TimeRange): void;
    get(): TimeRange[];
    get$(): import("rxjs").Observable<TimeRange[]>;
}
export type TimeHistoryContract = PublicMethodsOf<TimeHistory>;
