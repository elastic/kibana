export declare const CONNECTOR_ID = ".gen-ai";
export declare const CONNECTOR_NAME: string;
export declare enum SUB_ACTION {
    RUN = "run",
    INVOKE_AI = "invokeAI",
    INVOKE_STREAM = "invokeStream",
    INVOKE_ASYNC_ITERATOR = "invokeAsyncIterator",
    STREAM = "stream",
    DASHBOARD = "getDashboard",
    TEST = "test"
}
export declare enum OpenAiProviderType {
    OpenAi = "OpenAI",
    AzureAi = "Azure OpenAI",
    Other = "Other"
}
export declare const DEFAULT_TIMEOUT_MS = 200000;
export declare const DEFAULT_MODEL = "gpt-4.1";
export declare const OPENAI_CHAT_URL: "https://api.openai.com/v1/chat/completions";
export declare const OPENAI_LEGACY_COMPLETION_URL: "https://api.openai.com/v1/completions";
export declare const AZURE_OPENAI_CHAT_URL: "/openai/deployments/{deployment-id}/chat/completions?api-version={api-version}";
export declare const AZURE_OPENAI_COMPLETIONS_URL: "/openai/deployments/{deployment-id}/completions?api-version={api-version}";
export declare const AZURE_OPENAI_COMPLETIONS_EXTENSIONS_URL: "/openai/deployments/{deployment-id}/extensions/chat/completions?api-version={api-version}";
