export interface PackageInfo {
    platform: 'linux' | 'darwin' | 'win32';
    architecture: 'x64' | 'arm64';
    archiveFilename: string;
    archiveChecksum: string;
    binaryChecksum: string;
    binaryRelativePath: string;
    isPreInstalled: boolean;
    location: 'custom' | 'chromeForTesting';
}
interface CustomPackageInfo extends PackageInfo {
    location: 'custom';
}
interface ChromeForTestingPackageInfo extends PackageInfo {
    version: string;
    location: 'chromeForTesting';
    archivePath: string;
}
export declare class ChromiumArchivePaths {
    readonly packages: Array<CustomPackageInfo | ChromeForTestingPackageInfo>;
    readonly archivesPath: string;
    find(platform: string, architecture: string, packages?: PackageInfo[]): PackageInfo | undefined;
    resolvePath(p: PackageInfo): string;
    getAllArchiveFilenames(): string[];
    getDownloadUrl(p: PackageInfo): string;
    getBinaryPath(p: PackageInfo, chromiumPath: string): string;
}
export {};
