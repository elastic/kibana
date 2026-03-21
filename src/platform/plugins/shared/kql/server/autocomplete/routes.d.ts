import type { Observable } from 'rxjs';
import type { CoreSetup } from '@kbn/core/server';
import type { ConfigSchema } from '../config';
export declare function registerRoutes({ http }: CoreSetup, config$: Observable<ConfigSchema>): void;
