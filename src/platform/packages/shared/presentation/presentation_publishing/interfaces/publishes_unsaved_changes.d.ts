import type { Observable } from 'rxjs';
export interface PublishesUnsavedChanges {
    hasUnsavedChanges$: Observable<boolean>;
}
export declare const apiPublishesUnsavedChanges: (api: unknown) => api is PublishesUnsavedChanges;
