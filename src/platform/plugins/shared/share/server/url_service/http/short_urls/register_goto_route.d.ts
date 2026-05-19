import type { CoreSetup, IRouter } from '@kbn/core/server';
/**
 * This endpoint maintains the legacy /goto/<short_url_id> route. It loads the
 * /app/goto/<short_url_id> app which handles the redirection.
 */
export declare const registerGotoRoute: (router: IRouter, core: CoreSetup) => void;
