export interface EMSConfig {
    includeElasticMapsService: boolean;
    emsUrl: string;
    emsFileApiUrl: string;
    emsTileApiUrl: string;
    emsLandingPageUrl: string;
    emsFontLibraryUrl: string;
}
export declare function createEMSSettings(emsConfig: EMSConfig, getIsEnterprisePlus: () => boolean): EMSSettings;
export declare class EMSSettings {
    private readonly _config;
    private readonly _getIsEnterprisePlus;
    constructor(config: EMSConfig, getIsEnterprisePlus: () => boolean);
    isEMSUrlSet(): boolean;
    getEMSRoot(): string;
    isIncludeElasticMapsService(): boolean;
    hasOnPremLicense(): boolean;
    isEMSEnabled(): boolean;
    getEMSFileApiUrl(): string;
    getEMSTileApiUrl(): string;
    getEMSLandingPageUrl(): string;
    getEMSFontLibraryUrl(): string;
}
