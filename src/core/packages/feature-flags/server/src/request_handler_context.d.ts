/**
 * The HTTP request handler context for evaluating feature flags
 */
export interface FeatureFlagsRequestHandlerContext {
    /**
     * Evaluates a boolean flag
     * @param flagName The flag ID to evaluate
     * @param fallbackValue If the flag cannot be evaluated for whatever reason, the fallback value is provided.
     * @public
     */
    getBooleanValue(flagName: string, fallbackValue: boolean): Promise<boolean>;
    /**
     * Evaluates a string flag
     * @param flagName The flag ID to evaluate
     * @param fallbackValue If the flag cannot be evaluated for whatever reason, the fallback value is provided.
     * @public
     */
    getStringValue<Value extends string>(flagName: string, fallbackValue: Value): Promise<Value>;
    /**
     * Evaluates a number flag
     * @param flagName The flag ID to evaluate
     * @param fallbackValue If the flag cannot be evaluated for whatever reason, the fallback value is provided.
     * @public
     */
    getNumberValue<Value extends number>(flagName: string, fallbackValue: Value): Promise<Value>;
}
