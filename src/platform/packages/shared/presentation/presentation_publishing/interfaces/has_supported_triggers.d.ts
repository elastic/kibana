export interface HasSupportedTriggers {
    supportedTriggers: () => string[];
}
export declare const apiHasSupportedTriggers: (api: unknown | null) => api is HasSupportedTriggers;
