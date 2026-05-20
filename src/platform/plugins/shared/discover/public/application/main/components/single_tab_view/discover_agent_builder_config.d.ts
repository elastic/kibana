import { type AggregateQuery, type Query } from '@kbn/es-query';
import { type AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { type DeepAnalysisPlaybookExtension } from '../../../../context_awareness';
export declare const toDiscoverQuery: (currentQuery: AggregateQuery | Query | undefined, nextQuery: string, nextLanguage?: "kuery" | "lucene") => AggregateQuery | Query;
export declare const buildScreenContext: (dataViewTitle: string, query: AggregateQuery | Query | undefined, columns: string[] | undefined, dataSourceType: string | undefined, timeRange: {
    from: string;
    to: string;
} | undefined) => AttachmentInput;
export declare const buildEsqlResultsAttachment: (esqlQuery: string, esqlQueryColumns: Array<{
    name: string;
    meta?: {
        type?: string;
    };
}>, result: Array<{
    flattened: Record<string, unknown>;
}>, totalHits: number, timeRange: {
    from: string;
    to: string;
} | undefined, playbookContribution?: DeepAnalysisPlaybookExtension) => AttachmentInput;
export declare const DiscoverAgentBuilderConfig: () => null;
