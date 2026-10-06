import { type Observable } from 'rxjs';
import type { ChromeUserBanner } from '@kbn/core-chrome-browser';
export interface BodyClassesSideEffectDeps {
    kibanaVersion: string;
    headerBanner$: Observable<ChromeUserBanner | undefined>;
    isVisible$: Observable<boolean>;
    stop$: Observable<void>;
}
/** Updates body CSS classes based on chrome state changes. */
export declare const handleBodyClasses: ({ kibanaVersion, headerBanner$, isVisible$, stop$, }: BodyClassesSideEffectDeps) => void;
