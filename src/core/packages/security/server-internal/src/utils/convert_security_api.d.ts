import type { CoreSecurityDelegateContract } from '@kbn/core-security-server';
import type { InternalSecurityServiceStart } from '../internal_contracts';
export declare const convertSecurityApi: (privateApi: CoreSecurityDelegateContract) => InternalSecurityServiceStart;
