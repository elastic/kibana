import type { IRouter } from '@kbn/core/server';
import type { ServerStepRegistry } from '../step_registry';
/**
 * Registers the route to get all registered step definitions.
 * This endpoint is used by Scout tests to validate that new step registrations
 * are approved by the workflows-eng team.
 */
export declare function registerGetStepDefinitionsRoute(router: IRouter, registry: ServerStepRegistry): void;
