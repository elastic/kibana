export declare const CONNECTOR_ID = ".inference";
export declare const CONNECTOR_NAME: string;
export declare enum ServiceProviderKeys {
    amazonbedrock = "amazonbedrock",
    azureopenai = "azureopenai",
    azureaistudio = "azureaistudio",
    cohere = "cohere",
    elasticsearch = "elasticsearch",
    googleaistudio = "googleaistudio",
    googlevertexai = "googlevertexai",
    hugging_face = "hugging_face",
    mistral = "mistral",
    openai = "openai",
    anthropic = "anthropic",
    watsonxai = "watsonxai",
    'alibabacloud-ai-search' = "alibabacloud-ai-search",
    elastic = "elastic"
}
export declare enum SUB_ACTION {
    UNIFIED_COMPLETION_ASYNC_ITERATOR = "unified_completion_async_iterator",
    UNIFIED_COMPLETION_STREAM = "unified_completion_stream",
    UNIFIED_COMPLETION = "unified_completion",
    COMPLETION = "completion",
    RERANK = "rerank",
    TEXT_EMBEDDING = "text_embedding",
    SPARSE_EMBEDDING = "sparse_embedding",
    COMPLETION_STREAM = "completion_stream"
}
/**
 * Mapping of sub_action to task_type for inference connectors.
 * This maps each executable sub-action to its corresponding inference endpoint task type.
 */
export declare const TASK_TYPE_BY_SUB_ACTION: Record<SUB_ACTION, string>;
export declare const DEFAULT_PROVIDER = "openai";
export declare const DEFAULT_TASK_TYPE = "completion";
