import type { CoreSecurityDelegateContract } from '@kbn/core-security-browser';
import type { InternalSecurityServiceStart } from '../internal_contracts';
export declare const convertSecurityApi: (privateApi: CoreSecurityDelegateContract) => InternalSecurityServiceStart;
