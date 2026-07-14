import type { TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
declare const dataStreamsSchema: import("@kbn/config-schema").ObjectType<{
    migrations: import("@kbn/config-schema").ObjectType<{
        skip: import("@kbn/config-schema").Type<boolean>;
    }>;
}>;
export type DataStreamsConfigType = TypeOf<typeof dataStreamsSchema>;
export declare const config: ServiceConfigDescriptor<DataStreamsConfigType>;
export declare class DataStreamsConfig {
    migrations: TypeOf<typeof dataStreamsSchema>['migrations'];
    constructor(rawConfig: DataStreamsConfigType);
}
export {};
