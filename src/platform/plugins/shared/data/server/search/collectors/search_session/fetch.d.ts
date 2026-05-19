import type { Logger } from '@kbn/core/server';
import type { CollectorFetchContext } from '@kbn/usage-collection-plugin/server';
import type { ReportedUsage } from './register';
export declare function fetchProvider(getIndexForType: (type: string) => Promise<string>, logger: Logger): ({ esClient }: CollectorFetchContext) => Promise<ReportedUsage>;
