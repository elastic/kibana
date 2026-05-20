declare const CLOUD_PROVIDER_ICONS: {
    readonly gcp: "logoGCP";
    readonly aws: "logoAWS";
    readonly azure: "logoAzure";
    readonly unknownProvider: "cloudSunny";
};
export type CloudProvider = keyof typeof CLOUD_PROVIDER_ICONS | null | undefined;
export declare function getCloudProviderIcon(cloudProvider?: CloudProvider): "cloudSunny" | "logoAWS" | "logoAzure" | "logoGCP";
export {};
