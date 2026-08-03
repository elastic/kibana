import type { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '../../common';
export type { TriggerDocumentation, TriggerSnippets } from '../../common/trigger_registry/types';
/**
 * User-facing definition for a workflow trigger.
 * Spreads the shared common contract and adds UI-only presentation (icon).
 *
 * @example
 * {
 *   ...commonMyTriggerDefinition,
 *   icon: React.lazy(() => import('...')),
 * }
 */
export interface PublicTriggerDefinition<EventSchema extends z.ZodType = z.ZodType> extends CommonTriggerDefinition<EventSchema> {
    /**
     * Used to visually represent this trigger in the UI.
     */
    icon?: React.ComponentType;
}
