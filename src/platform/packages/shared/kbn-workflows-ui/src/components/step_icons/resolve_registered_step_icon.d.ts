import type { IconType } from '@elastic/eui';
import type { TypeRegistry } from '@kbn/alerts-ui-shared/lib';
import type { ActionTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import type { WorkflowsExtensionsPublicPluginStart } from '@kbn/workflows-extensions/public';
export interface ResolveRegisteredStepIconDeps {
    workflowsExtensions: WorkflowsExtensionsPublicPluginStart;
    actionTypeRegistry: TypeRegistry<ActionTypeModel>;
}
/**
 * Resolves a step icon from the dynamically-registered sources shared by the
 * plugin's `StepIcon` (workflow graphs/lists) and this package's `TypeIcon`
 * (catalog cards): a workflows-extensions step definition (or its base-type
 * family), the static connector-spec map, then the action-type registry.
 * Returns `undefined` when none of those have an icon, callers fall back to
 * the static `getStepIconType(stepType)` map.
 */
export declare function resolveRegisteredStepIcon(stepType: string, { workflowsExtensions, actionTypeRegistry }: ResolveRegisteredStepIconDeps): IconType | undefined;
