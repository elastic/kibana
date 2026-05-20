import { type DataTableRecord } from '@kbn/discover-utils';
type DataStreamType = 'logs' | 'metrics' | 'traces' | undefined;
export declare function getDataStreamType(record: DataTableRecord): DataStreamType;
export declare function getAttributesTitle(record: DataTableRecord): string;
export {};
