import { Report } from './report';
export declare type Storage = Map<string, any>;
export declare class ReportStorageManager {
    storageKey: string;
    private storage?;
    constructor(storageKey: string, storage?: Storage);
    get(): Report | undefined;
    store(report: Report): void;
}
//# sourceMappingURL=storage.d.ts.map