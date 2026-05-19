export declare class CachedResourceObserver {
    private loaded;
    private observer?;
    constructor();
    getCounts(): {
        networkOrDisk: number;
        memory: number;
    };
    destroy(): void;
}
