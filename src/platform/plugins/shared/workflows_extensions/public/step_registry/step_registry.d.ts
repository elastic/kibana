import type { Logger } from '@kbn/logging';
import type { z } from '@kbn/zod/v4';
import type { PublicStepDefinition } from './types';
import type { PublicStepDefinitionOrLoader } from '../types';
/**
 * Registry for public-side workflow step definition.
 * Stores UI-related information (label, description, icon) for step types.
 * Accepts either a definition directly or a loader function that returns a promise of a definition.
 */
export declare class PublicStepRegistry {
    private readonly logger;
    private readonly registry;
    private readonly pending;
    private whenReadyPromise;
    constructor(logger: Logger);
    /**
     * Register step definition.
     * @param definitionOrLoader - The step definition to register, or a function that returns a promise of the definition (e.g. for dynamic imports)
     * To skip step registration with async checks (like feature flags), the loader can resolve with undefined.
     */
    register<Input extends z.ZodType = z.ZodType, Output extends z.ZodType = z.ZodType, Config extends z.ZodObject = z.ZodObject>(definitionOrLoader: PublicStepDefinitionOrLoader<Input, Output, Config>): void;
    /**
     * Add a step definition to the registry.
     * @param definition - The step definition to add
     * @throws Error if the step id is already registered
     */
    private addToRegistry;
    /**
     * Returns a promise that resolves when all pending async loaders have settled.
     * Use before reading the registry if you need to guarantee all async registrations are complete.
     */
    whenReady(): Promise<void>;
    /**
     * Get definition for a specific step type.
     * @param stepTypeId - The step type identifier
     * @returns The step definition, or undefined if not found
     */
    get(stepTypeId: string): PublicStepDefinition | undefined;
    /**
     * Check if definition for a step type is registered.
     * @param stepTypeId - The step type identifier
     * @returns True if definition for the step type is registered, false otherwise
     */
    has(stepTypeId: string): boolean;
    /**
     * Get all registered step definition.
     * @returns Array of all registered step definition
     */
    getAll(): PublicStepDefinition[];
}
