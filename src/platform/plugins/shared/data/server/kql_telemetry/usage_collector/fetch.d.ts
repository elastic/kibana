import type { CollectorFetchContext } from '@kbn/usage-collection-plugin/server';
export interface Usage {
    optInCount: number;
    optOutCount: number;
    defaultQueryLanguage: string;
}
export declare function fetchProvider(getIndexForType: (type: string) => Promise<string>): ({ esClient }: CollectorFetchContext) => Promise<Usage>;
