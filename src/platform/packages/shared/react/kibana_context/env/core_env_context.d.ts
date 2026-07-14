import type { CoreEnv } from '@kbn/core-base-browser-internal';
/**
 * Hook to access the environment context
 * @throws Error if used outside of KibanaEnvContext
 */
export declare const useCoreEnv: () => CoreEnv;
/**
 * The environment context provider
 */
export declare const CoreEnvContextProvider: import("react").Provider<CoreEnv | undefined>;
