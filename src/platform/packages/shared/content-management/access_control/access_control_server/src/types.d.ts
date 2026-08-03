import type { CoreSetup } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
export interface CheckGlobalAccessControlPrivilegeDependencies {
    http: CoreSetup['http'];
    isAccessControlEnabled: boolean;
    getStartServices: () => Promise<{
        security?: SecurityPluginStart;
    }>;
}
