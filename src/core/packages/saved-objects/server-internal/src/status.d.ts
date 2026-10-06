import type { Observable } from 'rxjs';
import { type ServiceStatus } from '@kbn/core-status-common';
import type { SavedObjectStatusMeta } from '@kbn/core-saved-objects-server';
import type { KibanaMigratorStatus } from '@kbn/core-saved-objects-base-server-internal';
export declare const calculateStatus$: (rawMigratorStatus$: Observable<KibanaMigratorStatus>, elasticsearchStatus$: Observable<ServiceStatus>) => Observable<ServiceStatus<SavedObjectStatusMeta>>;
