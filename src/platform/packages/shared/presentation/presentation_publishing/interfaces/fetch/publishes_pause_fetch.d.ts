import type { Observable } from 'rxjs';
export interface PublishesPauseFetch {
    isFetchPaused$: Observable<boolean>;
}
export interface PublishesEditablePauseFetch extends PublishesPauseFetch {
    setFetchPaused: (paused: boolean) => void;
}
export declare const apiPublishesPauseFetch: (unknownApi: null | unknown) => unknownApi is PublishesPauseFetch;
export declare const apiPublishesEditablePauseFetch: (unknownApi: null | unknown) => unknownApi is PublishesEditablePauseFetch;
