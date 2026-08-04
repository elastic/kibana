import type { z } from '@kbn/zod/v4';
import type { PublicTriggerDefinition } from './types';
import type { PublicTriggerDefinitionOrLoader } from '../types';
/**
 * Registry for public-side workflow trigger definitions.
 * Stores UI-related information (title, description, icon, eventSchema, snippets) for triggers.
 */
export declare class PublicTriggerRegistry {
    private readonly registry;
    private readonly pending;
    private whenReadyPromise;
    /**
     * Register a trigger definition.
     * @param definitionOrLoader - The trigger definition to register, or a function that returns a promise of the definition (e.g. for dynamic imports)
     * @throws Error if a trigger with the same ID is already registered
     */
    register<EventSchema extends z.ZodType = z.ZodType>(definitionOrLoader: PublicTriggerDefinitionOrLoader<EventSchema>): void;
    /**
     * Add a trigger definition to the registry.
     * @param definition - The trigger definition to add
     * @throws Error if the trigger id is already registered
     */
    private addToRegistry;
    /**
     * Returns a promise that resolves when all pending async loaders have settled.
     * Use before reading the registry if you need to guarantee all async registrations are complete.
     */
    whenReady(): Promise<void>;
    /**
     * Get a trigger definition by id.
     * @param triggerId - The trigger identifier
     * @returns The trigger definition, or undefined if not found
     */
    get(triggerId: string): PublicTriggerDefinition | undefined;
    /**
     * Check if a trigger is registered.
     * @param triggerId - The trigger identifier
     * @returns True if the trigger is registered, false otherwise
     */
    has(triggerId: string): boolean;
    /**
     * Get all registered trigger definitions.
     * @returns Array of registered trigger definitions
     */
    getAll(): PublicTriggerDefinition[];
}
