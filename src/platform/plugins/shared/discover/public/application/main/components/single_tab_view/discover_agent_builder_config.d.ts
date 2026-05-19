import { type AggregateQuery, type Query } from '@kbn/es-query';
import type { ActiveConversation } from '@kbn/agent-builder-browser';
import { type AttachmentInput } from '@kbn/agent-builder-common/attachments';
export declare const toDiscoverQuery: (currentQuery: AggregateQuery | Query | undefined, nextQuery: string, nextLanguage?: "kuery" | "lucene") => AggregateQuery | Query;
export declare const buildScreenContext: (dataViewTitle: string, query: AggregateQuery | Query | undefined, columns: string[] | undefined, dataSourceType: string | undefined, timeRange: {
    from: string;
    to: string;
} | undefined) => AttachmentInput;
export declare const shouldPrefillEsqlPrompt: (isEsqlMode: boolean, activeConversation: ActiveConversation | null | undefined, hasPrefilled: boolean) => boolean;
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
} | undefined) => AttachmentInput;
export declare const DiscoverAgentBuilderConfig: () => null;
