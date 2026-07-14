import { type Observable } from 'rxjs';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
import type { ChromeStyle, ChromeUserBanner } from '@kbn/core-chrome-browser';
export interface BodyClassesSideEffectDeps {
    kibanaVersion: string;
    headerBanner$: Observable<ChromeUserBanner | undefined>;
    isVisible$: Observable<boolean>;
    chromeStyle$: Observable<ChromeStyle | undefined>;
    actionMenu$: Observable<MountPoint | undefined>;
    stop$: Observable<void>;
}
/** Updates body CSS classes based on chrome state changes. */
export declare const handleBodyClasses: ({ kibanaVersion, headerBanner$, isVisible$, chromeStyle$, actionMenu$, stop$, }: BodyClassesSideEffectDeps) => void;
