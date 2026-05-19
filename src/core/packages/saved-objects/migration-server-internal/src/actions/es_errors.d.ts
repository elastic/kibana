import type { ErrorCause } from '@elastic/elasticsearch/lib/api/types';
export declare const isWriteBlockException: (errorCause?: ErrorCause) => boolean;
export declare const isIncompatibleMappingException: (errorCause?: ErrorCause) => boolean;
export declare const isIndexNotFoundException: (errorCause?: ErrorCause) => boolean;
export declare const isUnavailableShardsException: (errorCause?: ErrorCause) => boolean;
export declare const isClusterShardLimitExceeded: (errorCause?: ErrorCause) => boolean;
export declare const hasAllKeywordsInOrder: (message: string | null | undefined, keywords: string[]) => boolean;
