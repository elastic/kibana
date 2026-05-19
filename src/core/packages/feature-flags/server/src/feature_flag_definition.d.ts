/**
 * List of {@link FeatureFlagDefinition}
 */
export type FeatureFlagDefinitions = Array<FeatureFlagDefinition<'boolean'> | FeatureFlagDefinition<'string'> | FeatureFlagDefinition<'number'>>;
/**
 * Definition of a feature flag
 */
export interface FeatureFlagDefinition<ValueType extends 'boolean' | 'string' | 'number'> {
    /**
     * The ID of the feature flag. Used to reference it when evaluating the flag.
     */
    key: string;
    /**
     * Human friendly name.
     */
    name: string;
    /**
     * Description of the purpose of the feature flag.
     */
    description?: string;
    /**
     * Tags to apply to the feature flag for easier categorizing. It may include the plugin, the solution, the team.
     */
    tags: string[];
    /**
     * The type of the values returned by the feature flag ("string", "boolean", or "number").
     */
    variationType: ValueType;
    /**
     * List of variations of the feature flags.
     */
    variations: Array<{
        /**
         * Human friendly name of the variation.
         */
        name: string;
        /**
         * Description of the variation.
         */
        description?: string;
        /**
         * The value of the variation.
         */
        value: ValueType extends 'string' ? string : ValueType extends 'boolean' ? boolean : number;
    }>;
}
