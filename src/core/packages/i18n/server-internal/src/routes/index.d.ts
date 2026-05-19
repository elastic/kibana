import type { IRouter } from '@kbn/core-http-server';
export declare const registerRoutes: ({ router, locale, isDist, translationHashes, localeFileMap, }: {
    router: IRouter;
    locale: string;
    isDist: boolean;
    translationHashes: Record<string, string>;
    localeFileMap: Record<string, string[]>;
}) => void;
