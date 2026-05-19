/**
 * Shared transpiler configuration that can be consumed by both Babel and SWC.
 * This ensures consistent behavior across different transpilers.
 */
export interface SharedTranspilerConfig {
    /** TypeScript parser configuration */
    typescript: {
        allowNamespaces: boolean;
        allowDeclareFields: boolean;
        decoratorsLegacy: boolean;
    };
    /** React transformation configuration */
    react: {
        runtime: 'automatic' | 'classic';
    };
    /** Emotion CSS-in-JS configuration */
    emotion: {
        labelFormat: string;
    };
    /** styled-components file patterns (for Babel overrides) */
    styledComponents: {
        /** RegExp patterns for files using styled-components */
        patterns: RegExp[];
    };
    /** Polyfill configuration */
    polyfills: {
        coreJsVersion: string;
    };
    /** Babel-specific additional configuration */
    babel: {
        runtimeVersion: string;
    };
}
/**
 * Get the shared transpiler configuration.
 * This is the single source of truth for transpiler settings.
 *
 * @returns SharedTranspilerConfig - Configuration object for both Babel and SWC
 */
export declare function getSharedConfig(): SharedTranspilerConfig;
