/**
 * Returns whether the Workflow Template Library tech preview is enabled, reading
 * the global (not per-space) `workflowsManagement:library:enabled` uiSetting.
 * Reactive — re-renders when an admin flips the setting. Works from any plugin
 * via core's `settings.globalClient` (no dependency on `workflows_management`).
 */
export declare function useLibraryEnabled(): boolean;
