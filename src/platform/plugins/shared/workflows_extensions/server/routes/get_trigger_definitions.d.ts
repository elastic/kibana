import type { IRouter } from '@kbn/core/server';
import type { TriggerRegistry } from '../trigger_registry';
/**
 * Registers the route to get all registered trigger definitions.
 * This endpoint is used by Scout tests to validate that new trigger registrations
 * are approved by the workflows-eng team.
 */
export declare function registerGetTriggerDefinitionsRoute(router: IRouter, registry: TriggerRegistry): void;
