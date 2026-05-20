export declare const CONNECTOR_ID = ".gemini";
export declare const CONNECTOR_NAME: string;
export declare enum SUB_ACTION {
    RUN = "run",
    DASHBOARD = "getDashboard",
    TEST = "test",
    INVOKE_AI = "invokeAI",
    INVOKE_AI_RAW = "invokeAIRaw",
    INVOKE_STREAM = "invokeStream"
}
export declare const DEFAULT_TOKEN_LIMIT = 8192;
export declare const DEFAULT_TIMEOUT_MS = 200000;
export declare const DEFAULT_GCP_REGION = "us-central1";
export declare const DEFAULT_MODEL = "gemini-2.5-pro";
export declare const DEFAULT_URL: "https://us-central1-aiplatform.googleapis.com";
