import type { LicenseType } from '@kbn/licensing-types';
export declare enum ACTION_TYPE_SOURCES {
    spec = "spec",
    yml = "yml",
    stack = "stack"
}
export type ActionTypeSource = keyof typeof ACTION_TYPE_SOURCES;
export declare enum SUB_FEATURE {
    endpointSecurity = 0
}
export type SubFeature = keyof typeof SUB_FEATURE;
export interface ActionType {
    id: string;
    name: string;
    enabled: boolean;
    enabledInConfig: boolean;
    enabledInLicense: boolean;
    minimumLicenseRequired: LicenseType;
    supportedFeatureIds: string[];
    isSystemActionType: boolean;
    source?: ActionTypeSource;
    subFeature?: SubFeature;
    isDeprecated: boolean;
    allowMultipleSystemActions?: boolean;
    description?: string;
    isExperimental?: boolean;
}
export type ConnectorUserAuthStatus = 'connected' | 'not_connected' | 'not_applicable';
export type ConnectorAuthStatusMap = Record<string, {
    userAuthStatus: ConnectorUserAuthStatus;
}>;
