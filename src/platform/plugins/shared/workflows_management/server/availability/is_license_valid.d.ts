import type { ILicense, LicenseType } from '@kbn/licensing-types';
/** The minimum required license type for Workflows. */
export declare const REQUIRED_LICENSE_TYPE: LicenseType;
export declare function isLicenseValid(license: ILicense): boolean;
