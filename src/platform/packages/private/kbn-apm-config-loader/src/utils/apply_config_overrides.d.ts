/**
 * Manually applies the specific configuration overrides we need to load the APM config.
 * Currently, only these are needed:
 *   - server.uuid
 *   - path.data
 *   - elastic.apm.*
 *   - telemetry.*
 *   - monitoring_collection.*
 */
export declare const applyConfigOverrides: (config: Record<string, any>, argv: string[]) => void;
