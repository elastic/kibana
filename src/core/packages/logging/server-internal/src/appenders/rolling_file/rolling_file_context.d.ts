export type GetOrderedRolledFileFn = () => Promise<string[]>;
/**
 * Context shared between the rolling file manager, policy and strategy.
 */
export declare class RollingFileContext {
    #private;
    readonly filePath: string;
    constructor(filePath: string);
    /**
     * The size of the currently opened file.
     */
    currentFileSize: number;
    /**
     * The time the currently opened file was created.
     */
    currentFileTime: number;
    refreshFileInfo(): void;
    getOrderedRolledFiles(): Promise<string[]>;
    setOrderedRolledFileFn(fn: GetOrderedRolledFileFn): void;
}
