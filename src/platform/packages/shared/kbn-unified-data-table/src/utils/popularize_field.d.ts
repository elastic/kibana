import type { Capabilities } from '@kbn/core/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
declare function popularizeField(dataView: DataView, fieldName: string, DataViewsService: DataViewsContract, capabilities: Capabilities): Promise<void>;
export { popularizeField };
