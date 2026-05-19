import type { Observable } from 'rxjs';
export interface PublishesReload {
    reload$: Observable<void>;
}
export declare const apiPublishesReload: (unknownApi: null | unknown) => unknownApi is PublishesReload;
