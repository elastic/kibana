export interface HasDisableTriggers {
    disableTriggers: boolean;
}
export declare const apiHasDisableTriggers: (api: unknown | null) => api is HasDisableTriggers;
export declare function areTriggersDisabled(api?: unknown): boolean;
