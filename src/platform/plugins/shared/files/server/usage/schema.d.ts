import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { FilesMetrics } from '../../common';
type MetricsWithoutExtension = Omit<FilesMetrics, 'countByExtension'>;
export type FileKindUsageSchema = MetricsWithoutExtension & {
    countByExtension: Array<{
        extension: string;
        count: number;
    }>;
};
export declare const filesSchema: MakeSchemaFrom<FileKindUsageSchema>;
export {};
