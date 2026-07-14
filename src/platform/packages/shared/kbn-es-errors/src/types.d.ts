/**
 * Detail information about an elasticsearch error.
 * @public
 */
export interface ElasticsearchErrorDetails {
    error?: {
        type: string;
        reason?: string;
    };
}
