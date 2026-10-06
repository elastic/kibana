import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
/**
 * @internal
 */
export interface ExecutionContextConfigType {
    enabled: boolean;
}
export declare const executionContextConfig: ServiceConfigDescriptor<ExecutionContextConfigType>;
