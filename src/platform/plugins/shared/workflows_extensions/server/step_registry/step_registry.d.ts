import type { ServerStepDefinition } from './types';
/**
 * Registry for server-side workflow step implementations.
 * Stores step handlers and definitions.
 */
export declare class ServerStepRegistry {
    private readonly registry;
    /**
     * Register a step definition.
     * @param definition - The step definition to register
     * @throws Error if a step with the same ID is already registered
     */
    register(definition: ServerStepDefinition): void;
    /**
     * Get a step definition for a given step type ID.
     * @param stepTypeId - The step type identifier
     * @returns The step definition, or undefined if not found
     */
    get(stepTypeId: string): ServerStepDefinition | undefined;
    /**
     * Check if a step type is registered.
     * @param stepTypeId - The step type identifier
     * @returns True if the step type is registered, false otherwise
     */
    has(stepTypeId: string): boolean;
    /**
     * Get all registered step definitions.
     * @returns Array of registered step definitions
     */
    getAll(): ServerStepDefinition[];
}
