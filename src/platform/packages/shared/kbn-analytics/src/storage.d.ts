import type { Report } from './report';
export interface Storage<T = Report, S = void> {
    get: (key: string) => T | undefined;
    set: (key: string, value: T) => S;
    remove: (key: string) => T | undefined;
    clear: () => void;
}
export declare class ReportStorageManager {
    storageKey: string;
    private storage?;
    constructor(storageKey: string, storage?: Storage);
    get(): Report | undefined;
    store(report: Report): void;
}
