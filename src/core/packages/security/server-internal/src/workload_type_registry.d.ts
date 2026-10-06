import type { ServiceAccountWorkloadTypeRegistration } from '@kbn/core-security-server';
/**
 * The workload types plugins have registered, keyed by plugin.
 */
export declare class WorkloadTypeRegistry {
    private readonly byPlugin;
    /**
     * Records a workload type for a plugin. Throws on an invalid type, name or description, and
     * when the plugin has already registered that type.
     */
    register(pluginId: string, registration: ServiceAccountWorkloadTypeRegistration): void;
    isRegistered(pluginId: string, type: string): boolean;
    get(pluginId: string, type: string): ServiceAccountWorkloadTypeRegistration | undefined;
}
