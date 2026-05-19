import type { CollectorFetchContext } from '@kbn/usage-collection-plugin/server';
import type { ReportedUsage } from './register';
export declare function fetchProvider(getIndexForType: (type: string) => Promise<string>): ({ esClient }: CollectorFetchContext) => Promise<ReportedUsage>;
