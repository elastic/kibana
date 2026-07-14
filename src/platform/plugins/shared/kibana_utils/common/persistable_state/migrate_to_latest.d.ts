import type { SerializableRecord } from '@kbn/utility-types';
import type { VersionedState, MigrateFunctionsObject } from './types';
export declare function migrateToLatest<S extends SerializableRecord>(migrations: MigrateFunctionsObject, { state, version: oldVersion }: VersionedState, loose?: boolean): S;
