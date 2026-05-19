import type { ServerTriggerDefinition } from '../types';
/**
 * Registry for workflow trigger definitions.
 */
export declare class TriggerRegistry {
    private readonly registry;
    private frozen;
    /**
     * Register a trigger definition.
     * Must be called during plugin setup. Validates id format and eventSchema (Zod object).
     *
     * @param definition - The server trigger definition (id + eventSchema)
     * @throws Error if trigger id is already registered, validation fails, or registration is attempted after setup
     */
    register(definition: ServerTriggerDefinition): void;
    /**
     * Freeze the registry so no further registrations are allowed.
     * Called when the plugin starts; after this, only get/has/list are valid.
     */
    freeze(): void;
    /**
     * Get a trigger definition by id.
     *
     * @param triggerId - The trigger identifier
     * @returns The trigger definition, or undefined if not found
     */
    get(triggerId: string): ServerTriggerDefinition | undefined;
    /**
     * Check if a trigger is registered.
     *
     * @param triggerId - The trigger identifier
     * @returns True if the trigger is registered, false otherwise
     */
    has(triggerId: string): boolean;
    /**
     * Get all registered trigger definitions.
     *
     * @returns Array of registered trigger definitions
     */
    list(): ServerTriggerDefinition[];
}
