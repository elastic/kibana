import type { Logger } from '@kbn/core/server';
import type { WorkflowsRequestHandlerContext } from '../../types';
/**
 * Preprocesses alert inputs by fetching full alert documents and transforming them
 * into the standardized alert event format using buildAlertEvent
 */
export declare function preprocessAlertInputs(inputs: Record<string, unknown>, context: WorkflowsRequestHandlerContext, spaceId: string, logger: Logger): Promise<Record<string, unknown>>;
