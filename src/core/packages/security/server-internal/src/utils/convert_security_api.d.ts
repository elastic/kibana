import type { CoreSecurityDelegateContract } from '@kbn/core-security-server';
import type { InternalSecurityServiceStart } from '../internal_contracts';
import type { WorkloadTypeRegistry } from '../workload_type_registry';
export declare const convertSecurityApi: (privateApi: CoreSecurityDelegateContract, workloadTypes: WorkloadTypeRegistry) => InternalSecurityServiceStart;
