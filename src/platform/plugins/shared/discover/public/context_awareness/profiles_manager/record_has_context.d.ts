import type { DataTableRecord } from '@kbn/discover-utils';
import type { DataTableRecordWithContext } from './scoped_profiles_manager';
export declare const recordHasContext: (record: DataTableRecord | undefined) => record is DataTableRecordWithContext;
