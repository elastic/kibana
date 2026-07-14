import type { SecurityServiceSetup, SecurityServiceStart } from '@kbn/core-security-server';
import type { CoreUiamService } from './uiam';
export interface InternalSecurityServiceSetup extends SecurityServiceSetup {
    /**
     * The {@link CoreUiamService | UIAM service}
     */
    uiam: CoreUiamService | null;
}
export type InternalSecurityServiceStart = SecurityServiceStart;
