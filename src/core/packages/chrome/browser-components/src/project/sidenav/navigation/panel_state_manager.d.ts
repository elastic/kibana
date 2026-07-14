/**
 * Manages the last active item state for navigation panel openers.
 * Provides persistence across browser sessions using sessionStorage.
 */
export declare class PanelStateManager {
    private readonly basePath;
    private readonly key;
    private state;
    constructor(basePath?: string);
    getPanelLastActive(panelId: string): string | undefined;
    setPanelLastActive(panelId: string, itemId: string): void;
    clear(): void;
    private load;
    private save;
}
