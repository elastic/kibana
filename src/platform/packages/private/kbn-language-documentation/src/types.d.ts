import type { LicenseType } from '@kbn/licensing-types';
export interface LanguageDocumentationSections {
    groups: DocumentationGroup[];
    initialSection: JSX.Element;
}
export interface DocumentationGroup {
    label: string;
    description?: string;
    items: DocumentationGroupItem[];
}
export interface DocumentationGroupItem {
    label: string;
    description: {
        markdownContent: string;
        openLinksInNewTab?: boolean;
    };
}
export interface Signature {
    params: Array<{
        name: string;
        type: string;
        optional?: boolean;
        supportsWildcard?: boolean;
    }>;
    license?: LicenseType;
}
export interface CommandDefinition {
    name: string;
    observability_tier?: string;
    license?: LicenseType;
}
export interface FunctionDefinition {
    name: string;
    snapshot_only: boolean;
    type: string;
    titleName: string;
    operator: string;
    preview: boolean;
    signatures: Signature[];
    license?: LicenseType;
}
export interface LicenseInfo {
    name: LicenseType;
    isSignatureSpecific?: boolean;
    paramsWithLicense?: string[];
}
export interface MultipleLicenseInfo {
    licenses: LicenseInfo[];
    hasMultipleLicenses: boolean;
}
