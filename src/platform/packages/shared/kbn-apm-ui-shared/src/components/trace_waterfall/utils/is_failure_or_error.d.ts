import type { EventOutcome, StatusCode } from '@kbn/apm-types';
export declare const isFailureOrError: (status: EventOutcome | StatusCode | undefined) => boolean;
