export declare const CONNECTOR_ID = ".bedrock";
export declare const CONNECTOR_NAME: string;
export declare const DEFAULT_MODEL = "us.anthropic.claude-sonnet-4-5-20250929-v1:0";
export declare const DEFAULT_URL: "https://bedrock-runtime.us-east-1.amazonaws.com";
export declare const DEFAULT_TIMEOUT_MS = 200000;
export declare const DEFAULT_TOKEN_LIMIT = 8191;
export declare enum SUB_ACTION {
    RUN = "run",
    INVOKE_AI = "invokeAI",
    INVOKE_AI_RAW = "invokeAIRaw",
    INVOKE_STREAM = "invokeStream",
    DASHBOARD = "getDashboard",
    TEST = "test",
    BEDROCK_CLIENT_SEND = "bedrockClientSend",
    CONVERSE = "converse",
    CONVERSE_STREAM = "converseStream"
}
