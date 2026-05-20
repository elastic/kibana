import type { Storage } from '.';
export declare const DEFAULT_SETTINGS: Readonly<{
    fontSize: 14;
    polling: true;
    pollInterval: 60000;
    tripleQuotes: true;
    wrapMode: true;
    autocomplete: Readonly<{
        fields: true;
        indices: true;
        templates: true;
        dataStreams: true;
    }>;
    isHistoryEnabled: true;
    isKeyboardShortcutsEnabled: true;
    isAccessibilityOverlayEnabled: true;
    selectedHost: string | null;
}>;
export interface DevToolsSettings {
    fontSize: number;
    wrapMode: boolean;
    autocomplete: {
        fields: boolean;
        indices: boolean;
        templates: boolean;
        dataStreams: boolean;
    };
    polling: boolean;
    pollInterval: number;
    tripleQuotes: boolean;
    isHistoryEnabled: boolean;
    isKeyboardShortcutsEnabled: boolean;
    isAccessibilityOverlayEnabled: boolean;
    selectedHost: string | null;
}
export declare class Settings {
    private readonly storage;
    constructor(storage: Storage);
    private addMigrationRule;
    getFontSize(): any;
    setFontSize(size: number): boolean;
    getWrapMode(): any;
    setWrapMode(mode: boolean): boolean;
    setTripleQuotes(tripleQuotes: boolean): boolean;
    getTripleQuotes(): any;
    getAutocomplete(): any;
    setAutocomplete(settings: object): boolean;
    getPolling(): any;
    setPolling(polling: boolean): boolean;
    setIsHistoryEnabled(isEnabled: boolean): boolean;
    getIsHistoryEnabled(): any;
    setPollInterval(interval: number): void;
    getPollInterval(): any;
    setIsKeyboardShortcutsEnabled(isEnabled: boolean): boolean;
    setIsAccessibilityOverlayEnabled(isEnabled: boolean): boolean;
    getIsKeyboardShortcutsDisabled(): any;
    getIsAccessibilityOverlayEnabled(): any;
    getSelectedHost(): any;
    setSelectedHost(host: string | null): boolean;
    toJSON(): DevToolsSettings;
    updateSettings({ fontSize, wrapMode, tripleQuotes, autocomplete, polling, pollInterval, isHistoryEnabled, isKeyboardShortcutsEnabled, isAccessibilityOverlayEnabled, selectedHost, }: DevToolsSettings): void;
}
interface Deps {
    storage: Storage;
}
export declare function createSettings({ storage }: Deps): Settings;
export {};
