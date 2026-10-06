import type { IKibanaMigrator } from '@kbn/core-saved-objects-base-server-internal';
import type { InternalSavedObjectRouter } from '../internal_types';
export declare const registerMigrateRoute: (router: InternalSavedObjectRouter, migratorPromise: Promise<IKibanaMigrator>) => void;
