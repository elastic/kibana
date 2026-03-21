import type { Logger } from '@kbn/core/server';
import type { WorkflowDetailDto } from '@kbn/workflows';
import type { WorkflowsManagementApi } from '../workflows_management/workflows_management_api';
export interface ResolveMatchingWorkflowSubscriptionsParams {
    triggerId: string;
    spaceId: string;
    eventContext: Record<string, unknown>;
}
export interface ResolveMatchingWorkflowSubscriptionsDeps {
    api: Pick<WorkflowsManagementApi, 'getWorkflowsSubscribedToTrigger'>;
    logger: Logger;
}
/**
 * Resolves workflows that are subscribed to the given trigger and whose trigger
 * condition matches the event context.
 */
export declare function resolveMatchingWorkflowSubscriptions(params: ResolveMatchingWorkflowSubscriptionsParams, deps: ResolveMatchingWorkflowSubscriptionsDeps): Promise<WorkflowDetailDto[]>;
