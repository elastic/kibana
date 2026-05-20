import type { SavedObjectMigrationContext } from '@kbn/core/server';
import type { DashboardDoc730ToLatest, DashboardDoc700To720 } from './types';
export declare function isDashboardDoc(doc: {
    [key: string]: unknown;
} | DashboardDoc730ToLatest): doc is DashboardDoc730ToLatest;
export declare const migrations730: (doc: DashboardDoc700To720, { log }: SavedObjectMigrationContext) => DashboardDoc730ToLatest | DashboardDoc700To720;
