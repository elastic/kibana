import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import type { ThemeServiceSetup } from '@kbn/core-theme-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { FatalErrorsSetup } from '@kbn/core-fatal-errors-browser';
/** @internal */
export interface FatalErrorsServiceSetupDeps {
    analytics: AnalyticsServiceStart;
    i18n: I18nStart;
    theme: ThemeServiceSetup;
    injectedMetadata: InternalInjectedMetadataSetup;
}
/** @internal */
export declare class FatalErrorsService {
    private rootDomElement;
    private onFirstErrorCb;
    private readonly error$;
    private fatalErrors?;
    private handlers;
    /**
     *
     * @param rootDomElement
     * @param onFirstErrorCb - Callback function that gets executed after the first error,
     *   but before the FatalErrorsService renders the error to the DOM.
     */
    constructor(rootDomElement: HTMLElement, onFirstErrorCb: () => void);
    setup(deps: FatalErrorsServiceSetupDeps): FatalErrorsSetup;
    start(): FatalErrorsSetup;
    private renderError;
    private renderCustomError;
    private setupGlobalErrorHandlers;
}
