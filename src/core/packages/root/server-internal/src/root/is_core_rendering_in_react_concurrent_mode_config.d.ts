import type { TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
/**
 * Configuration for the core rendering service's React rendering mode.
 * When true, the core rendering service uses `createRoot` (React 18 concurrent mode).
 * When false, it falls back to the legacy `ReactDOM.render`.
 * This only affects the core rendering service; individual plugins manage their own rendering.
 * Defaults to true.
 */
declare const configSchema: import("@kbn/config-schema").Type<boolean>;
export type IsCoreRenderingInReactConcurrentModeConfigType = TypeOf<typeof configSchema>;
export declare const isCoreRenderingInReactConcurrentModeConfig: ServiceConfigDescriptor<IsCoreRenderingInReactConcurrentModeConfigType>;
export {};
