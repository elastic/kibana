import type { Logger } from '@kbn/logging';
import type { z } from '@kbn/zod/v4';
import type { ServerStepDefinition } from './types';
import type { ServerStepDefinitionOrLoader } from '../types';
/**
 * Registry for server-side workflow step implementations.
 * Stores step handlers and definitions.
 */
export declare class ServerStepRegistry {
    private readonly logger;
    private readonly registry;
    private readonly pending;
    constructor(logger: Logger);
    /**
     * Register step definition.
     * @param definitionOrLoader - The step definition to register, or a function that returns a promise of the definition (e.g. for dynamic imports)
     * To skip step registration with async checks (like feature flags), the loader can resolve with undefined.
     */
    register<Input extends z.ZodType = z.ZodType, Output extends z.ZodType = z.ZodType, Config extends z.ZodObject = z.ZodObject>(definitionOrLoader: ServerStepDefinitionOrLoader<Input, Output, Config>): void;
    /**
     * Add a step definition to the registry.
     * @param definition - The step definition to add
     * @throws Error if the step id is already registered
     */
    private addToRegistry;
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
    /**
     * Returns a promise that resolves when all pending async loaders have settled.
     * Use before reading the registry if you need to guarantee all async registrations are complete.
     */
    whenReady(): Promise<void>;
}
