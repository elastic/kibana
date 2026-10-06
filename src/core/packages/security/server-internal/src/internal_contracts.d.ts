import type { CoreServiceAccountsService, SecurityServiceSetup, SecurityServiceStart, ServiceAccountWorkloadTypeRegistration } from '@kbn/core-security-server';
import type { CoreUiamService } from './uiam';
/**
 * Plugin-keyed counterpart of the public `CoreServiceAccountsSetup`. The plugin context closes
 * over the calling plugin's id, so plugins never supply it themselves.
 */
export interface InternalCoreServiceAccountsSetup {
    registerWorkloadType(pluginId: string, registration: ServiceAccountWorkloadTypeRegistration): void;
}
export interface InternalSecurityServiceSetup extends Omit<SecurityServiceSetup, 'serviceAccounts'> {
    serviceAccounts: InternalCoreServiceAccountsSetup;
    /**
     * The {@link CoreUiamService | UIAM service}
     */
    uiam: CoreUiamService | null;
}
/**
 * Plugin-keyed counterpart of the public `CoreServiceAccountsService`.
 */
export interface InternalCoreServiceAccountsStart {
    /**
     * Returns the service accounts contract as one plugin sees it: its workload methods act only on
     * workload types that plugin registered, and reach the delegate with that plugin's id.
     */
    asScopedToPlugin(pluginId: string): CoreServiceAccountsService;
}
export interface InternalSecurityServiceStart extends Omit<SecurityServiceStart, 'serviceAccounts'> {
    serviceAccounts: InternalCoreServiceAccountsStart;
}
