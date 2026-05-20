import type { ILicense } from '@kbn/licensing-types';
import type { ExportTypesRegistry } from './export_types_registry';
export interface LicenseCheckResult {
    showLinks: boolean;
    enableLinks: boolean;
    message?: string;
    jobTypes?: string[];
}
export declare function checkLicense(exportTypesRegistry: ExportTypesRegistry, license: ILicense | undefined): Record<string, LicenseCheckResult>;
