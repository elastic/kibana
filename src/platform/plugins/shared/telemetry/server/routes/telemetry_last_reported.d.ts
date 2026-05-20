import type { IRouter, SavedObjectsClient } from '@kbn/core/server';
import type { Observable } from 'rxjs';
export declare function registerTelemetryLastReported(router: IRouter, savedObjectsInternalClient$: Observable<SavedObjectsClient>): void;
