import type { TypeOf } from '@kbn/config-schema';
import type { Writable } from '@kbn/utility-types';
import type { storedFilterSchema } from '@kbn/es-query-server';
/**
 * Local type definition for stored filters
 * Inferred from the storedFilterSchema in @kbn/es-query-server
 */
export type StoredFilter = Writable<TypeOf<typeof storedFilterSchema>>;
