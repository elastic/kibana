import type { TriggerRegistry } from './trigger_registry/trigger_registry';
import type { EmitEventParams, TriggerEventHandler } from './types';
export interface EmitEventDeps {
    triggerRegistry: TriggerRegistry;
    triggerEventHandler: TriggerEventHandler | null;
}
/**
 * Emits an event for a trigger type. Call this when something happens that workflows may be subscribed to.
 * The trigger must be registered (e.g. via registerTriggerDefinition); subscribed workflows are resolved and run by the platform.
 * When the trigger has an eventSchema, the payload is validated against it; validation failure throws.
 *
 * @throws Error if triggerId is not registered
 * @throws Error if payload does not match the trigger's eventSchema
 * @throws Error if no trigger event handler has been registered
 */
export declare function emitEvent(params: EmitEventParams, deps: EmitEventDeps): Promise<void>;
