/**
 * The label format for Emotion CSS-in-JS.
 * This is used by both Babel and SWC to generate consistent class names.
 * Format: [filename]--[local]
 * Example: MyComponent--container
 */
export declare const EMOTION_LABEL_FORMAT = "[filename]--[local]";
/**
 * Core.js version for polyfills.
 * Must match the version installed in package.json.
 */
export declare const CORE_JS_VERSION = "3.37.1";
/**
 * Babel runtime version for @babel/plugin-transform-runtime.
 */
export declare const BABEL_RUNTIME_VERSION = "^7.12.5";
/**
 * TypeScript configuration shared between transpilers.
 */
export declare const TYPESCRIPT_CONFIG: {
    /** Allow namespace declarations */
    readonly allowNamespaces: true;
    /** Allow declare fields in classes */
    readonly allowDeclareFields: true;
    /** Use legacy decorators (stage 2) */
    readonly decoratorsLegacy: true;
};
/**
 * React configuration shared between transpilers.
 */
export declare const REACT_CONFIG: {
    /** Enable React JSX runtime (automatic) */
    readonly runtime: "automatic";
};
