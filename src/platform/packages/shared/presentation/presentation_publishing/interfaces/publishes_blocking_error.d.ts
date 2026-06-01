import type { PublishingSubject } from '../publishing_subject';
export interface PublishesBlockingError {
    blockingError$: PublishingSubject<Error | undefined>;
}
export declare const apiPublishesBlockingError: (unknownApi: null | unknown) => unknownApi is PublishesBlockingError;
export declare function hasBlockingError(api: unknown): boolean;
