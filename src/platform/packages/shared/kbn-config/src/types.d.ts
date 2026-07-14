/**
 * @public
 */
export interface PackageInfo {
    version: string;
    branch: string;
    buildNum: number;
    buildSha: string;
    buildShaShort: string;
    buildDate: Date;
    buildFlavor: BuildFlavor;
    dist: boolean;
}
/**
 * @public
 */
export interface EnvironmentMode {
    name: 'development' | 'production';
    dev: boolean;
    prod: boolean;
}
export type BuildFlavor = 'serverless' | 'traditional';
