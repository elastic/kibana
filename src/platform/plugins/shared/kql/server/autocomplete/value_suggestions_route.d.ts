import type { IRouter } from '@kbn/core/server';
import type { Observable } from 'rxjs';
import type { ConfigSchema } from '../config';
export declare function registerValueSuggestionsRoute(router: IRouter, config$: Observable<ConfigSchema>): void;
