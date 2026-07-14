import type { I18nStart } from '@kbn/core-i18n-browser';
/**
 * Service that is responsible for i18n capabilities.
 * @internal
 */
export declare class I18nService {
    /**
     * Used exclusively to give a Context component to FatalErrorsService which
     * may render before Core successfully sets up or starts.
     *
     * Separated from `start` to disambiguate that this can be called from within
     * Core outside the lifecycle flow.
     * @internal
     */
    getContext(): I18nStart;
    start(): I18nStart;
    stop(): void;
}
