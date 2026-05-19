import type { CoreSetup } from '@kbn/core/public';
import type { Location } from 'history';
import { BehaviorSubject } from 'rxjs';
import type { UrlService } from '../../../common/url_service';
import type { RedirectOptions } from '../../../common/url_service/locators/redirect';
export interface RedirectManagerDependencies {
    url: UrlService;
}
export declare class RedirectManager {
    readonly deps: RedirectManagerDependencies;
    readonly error$: BehaviorSubject<Error | null>;
    constructor(deps: RedirectManagerDependencies);
    registerLocatorRedirectApp(core: CoreSetup): void;
    registerLegacyShortUrlRedirectApp(core: CoreSetup): void;
    onMount(location: Location, abortSignal?: AbortSignal): void;
    private navigateToShortUrlBySlug;
    navigate(options: RedirectOptions): void;
    protected parseSearchParams(urlLocationSearch: string): RedirectOptions;
}
