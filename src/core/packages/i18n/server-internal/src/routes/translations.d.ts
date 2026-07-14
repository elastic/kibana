import type { IRouter } from '@kbn/core-http-server';
export declare const registerTranslationsRoute: ({ router, locale, translationHashes, localeFileMap, isDist, }: {
    router: IRouter;
    locale: string;
    translationHashes: Record<string, string>;
    localeFileMap: Record<string, string[]>;
    isDist: boolean;
}) => void;
