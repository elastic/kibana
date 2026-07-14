import type { TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
import type { IExternalUrlPolicy } from '@kbn/core-http-common';
/**
 * @internal
 */
export type ExternalUrlConfigType = TypeOf<typeof externalUrlConfigSchema>;
declare const externalUrlConfigSchema: import("@kbn/config-schema").ObjectType<{
    policy: import("@kbn/config-schema").Type<IExternalUrlPolicy[]>;
}>;
export declare const externalUrlConfig: ServiceConfigDescriptor<ExternalUrlConfigType>;
export {};
