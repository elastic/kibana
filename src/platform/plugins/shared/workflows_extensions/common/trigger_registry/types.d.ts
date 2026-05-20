import type { z } from '@kbn/zod/v4';
/**
 * Shared trigger contract (common to server and public).
 *
 * Constraints (enforced at registration):
 * - id: globally unique, namespaced format <solution>.<event>
 * - eventSchema: must be a Zod object schema that rejects unknown fields
 */
export interface CommonTriggerDefinition<EventSchema extends z.ZodType = z.ZodType> {
    /** Globally unique, namespaced identifier (e.g. cases.updated, alerts.severity_high) */
    id: string;
    /**
     * Payload contract (Zod object schema; must reject unknown fields by default).
     * Adding descriptions to properties (e.g. with .describe()) is recommended so they will
     * help users to understand the data they will receive with the event.
     */
    eventSchema: EventSchema;
}
