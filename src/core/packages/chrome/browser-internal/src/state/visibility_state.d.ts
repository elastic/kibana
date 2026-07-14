import { type Observable } from 'rxjs';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
export interface VisibilityStateDeps {
    application: InternalApplicationStart;
}
export interface VisibilityState {
    isVisible$: Observable<boolean>;
    setIsVisible: (isVisible: boolean) => void;
}
export declare const createVisibilityState: ({ application }: VisibilityStateDeps) => VisibilityState;
