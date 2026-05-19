export interface EmbeddableAppContext {
    /**
     * Current app's path including query and hash starting from {appId}
     */
    getCurrentPath?: () => string;
    currentAppId: string;
}
export interface HasAppContext {
    getAppContext: () => EmbeddableAppContext;
}
export declare const apiHasAppContext: (unknownApi: unknown) => unknownApi is HasAppContext;
