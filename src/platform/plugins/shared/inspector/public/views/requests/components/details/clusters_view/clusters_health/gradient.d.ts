import type { estypes } from '@elastic/elasticsearch';
export type ClusterHealthStatus = Exclude<estypes.ClusterSearchStatus, 'running'>;
export declare function useHealthHexCodes(): Record<ClusterHealthStatus, string>;
export declare function useHeathBarLinearGradient(successful: number, partial: number, skipped: number, failed: number): string;
