import type { ArtifactSpec } from './artifact';
export declare function getCustomSnapshotUrl(): string | undefined;
export declare function resolveCustomSnapshotUrl(urlVersion: string, license: string): ArtifactSpec | undefined;
