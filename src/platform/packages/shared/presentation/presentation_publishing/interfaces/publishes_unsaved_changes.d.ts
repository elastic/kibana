import type { MaybePromise } from '@kbn/utility-types';
import type { Observable } from 'rxjs';
export interface PublishesUnsavedChanges {
    hasUnsavedChanges$: Observable<boolean>;
    resetUnsavedChanges: () => MaybePromise<void>;
}
export declare const apiPublishesUnsavedChanges: (api: unknown) => api is PublishesUnsavedChanges;
