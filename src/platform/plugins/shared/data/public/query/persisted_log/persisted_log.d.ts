import type { Observable } from 'rxjs';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
interface PersistedLogOptions<T = any> {
    maxLength?: number | string;
    filterDuplicates?: boolean;
    isDuplicate?: (oldItem: T, newItem: T) => boolean;
    enableBrowserTabsSync?: boolean;
}
export declare class PersistedLog<T = any> {
    name: string;
    maxLength?: number;
    filterDuplicates?: boolean;
    isDuplicate: (oldItem: T, newItem: T) => boolean;
    storage: IStorageWrapper;
    items: T[];
    private update$;
    private storageEventListener?;
    private enableBrowserTabsSync;
    private subscriberCount;
    constructor(name: string, options: PersistedLogOptions<T> | undefined, storage: IStorageWrapper);
    /** Keeps browser tabs in sync. */
    private addStorageEventListener;
    private removeStorageEventListener;
    add(val: any): T[];
    get(): T[];
    get$(): Observable<T[]>;
}
export {};
