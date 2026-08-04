import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { WorkflowsExtensionsPublicPluginStart } from '@kbn/workflows-extensions/public';
type ActionTypeRegistry = TriggersAndActionsUIPublicPluginStart['actionTypeRegistry'];
export interface GetTypeIconDataUrlParams {
    type: string;
    kind: 'step' | 'trigger';
    workflowsExtensions: WorkflowsExtensionsPublicPluginStart;
    actionTypeRegistry: ActionTypeRegistry;
}
/**
 * Resolve a workflow step or trigger `type` to a data URL for the inline icon
 * rendered next to the `type:` value in the read-only preview. Resolution
 * mirrors the workflow editor: dynamically-registered icons (workflows
 * extensions + connector action-type registry) take precedence over the static
 * connector-spec and hardcoded fallbacks.
 */
export declare function getTypeIconDataUrl({ type, kind, workflowsExtensions, actionTypeRegistry, }: GetTypeIconDataUrlParams): Promise<string>;
export {};
