import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { TimeRange } from '@kbn/es-query';
export declare const computeInterval: (timeRange: TimeRange, data: DataPublicPluginStart) => string;
