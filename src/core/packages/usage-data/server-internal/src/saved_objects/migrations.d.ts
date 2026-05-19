import type { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import type { CoreUsageStats } from '@kbn/core-usage-data-server';
export declare const migrateTo7141: (doc: SavedObjectUnsanitizedDoc<CoreUsageStats>) => SavedObjectUnsanitizedDoc<CoreUsageStats>;
