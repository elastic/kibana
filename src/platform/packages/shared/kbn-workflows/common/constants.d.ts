/**
 * Feature ID for the workflows management feature
 */
export declare const WORKFLOWS_MANAGEMENT_FEATURE_ID = "workflowsManagement";
/**
 * UI Setting ID for enabling / disabling the workflows management UI
 */
export declare const WORKFLOWS_UI_SETTING_ID = "workflows:ui:enabled";
export declare const WORKFLOWS_UI_VISUAL_EDITOR_SETTING_ID = "workflows:ui:visualEditor:enabled";
export declare const WORKFLOWS_UI_EXECUTION_GRAPH_SETTING_ID = "workflows:ui:executionGraph:enabled";
export declare const WORKFLOWS_UI_SHOW_EXECUTOR_SETTING_ID = "workflows:ui:showExecutor:enabled";
export declare const WORKFLOWS_AI_AGENT_SETTING_ID = "workflows:aiAgent:enabled";
/**
 * Feature flag ID for enabling / disabling the workflow execution stats bar UI
 */
export declare const WORKFLOW_EXECUTION_STATS_BAR_SETTING_ID = "workflows:executionStatsBar:enabled";
/**
 * Map of regular (saved object) connector types -> their system connector equivalents.
 * Use this map to make the `connector-id` step config property optional for a given connector step type, allowing it to be executed via its linked system connector.
 * Pre-requisite for this to work:
 * - System connectors have empty config/secrets schemas. Make sure these system connectors are able to execute by receiving params alone.
 */
export declare const SystemConnectorsMap: Map<string, string>;
