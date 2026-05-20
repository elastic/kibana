import type { Storage } from '.';
export declare const isQuotaExceededError: (e: Error) => boolean;
export declare class History {
    private readonly storage;
    private changeEmitter;
    constructor(storage: Storage);
    getHistoryKeys(): string[];
    getHistory(): any[];
    change(listener: (reqs: unknown[]) => void): () => void;
    addToHistory(endpoint: string, method: string, data?: string): void;
    updateCurrentState(content: string): void;
    getLegacySavedEditorState(): {
        time: any;
        content: any;
    } | undefined;
    /**
     * This function should only ever be called once for a user if they had legacy state.
     */
    deleteLegacySavedEditorState(): void;
    clearHistory(): void;
}
export declare function createHistory(deps: {
    storage: Storage;
}): History;
