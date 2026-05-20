import type { DataSourceProfileProvider } from '../../../profiles';
export declare const createExampleDataSourceProfileProvider: () => DataSourceProfileProvider<{
    formatRecord: (flattenedRecord: Record<string, unknown>) => string;
}>;
