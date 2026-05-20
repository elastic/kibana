import type { HttpServiceSetup, IRouter } from '@kbn/core/server';
import type { ServerUrlService } from '../../types';
export declare const registerCreateRoute: (router: IRouter, url: ServerUrlService, http: HttpServiceSetup) => void;
