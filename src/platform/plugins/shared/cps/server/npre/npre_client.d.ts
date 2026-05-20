import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { ProjectRouting } from '@kbn/es-query';
/**
 * Client interface for interacting with named project routing expressions.
 */
export interface INpreClient {
    /**
     * Retrieves a project routing expression by name.
     * @param expressionName the name of the expression to retrieve.
     */
    getNpre(expressionName: string): Promise<ProjectRouting | undefined>;
    /**
     * Checks if the current user has permission to retrieve named project routing expressions.
     */
    canGetNpre(): Promise<boolean>;
    /**
     * Checks if the current user has permission to create or update named project routing expressions.
     */
    canPutNpre(): Promise<boolean>;
    /**
     * Creates or updates a project routing expression.
     * @param expressionName the name of the expression.
     * @param expression the Lucene expression string.
     */
    putNpre(expressionName: string, expression: string): Promise<{
        acknowledged: boolean;
    }>;
    /**
     * Deletes a project routing expression.
     * @param expressionName the name of the expression to delete.
     */
    deleteNpre(expressionName: string): Promise<{
        acknowledged: boolean;
    }>;
}
/**
 * Service for managing project routing expressions in Elasticsearch.
 */
export declare class NpreClient implements INpreClient {
    private readonly logger;
    private readonly esClient;
    constructor(logger: Logger, esClient: IScopedClusterClient);
    private getClient;
    getNpre(expressionName: string): Promise<ProjectRouting | undefined>;
    canGetNpre(): Promise<boolean>;
    canPutNpre(): Promise<boolean>;
    putNpre(expressionName: string, expression: string): Promise<{
        acknowledged: boolean;
    }>;
    deleteNpre(expressionName: string): Promise<{
        acknowledged: boolean;
    }>;
}
