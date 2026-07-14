/**
 * Coerce a semver-like string (x.y.z-SNAPSHOT) or prerelease version (x.y.z-alpha)
 * to regular semver (x.y.z).
 */
export declare function stripVersionQualifier(version: string): string;
