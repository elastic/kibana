import type { TypeOf } from '@kbn/config-schema';
import { type Type } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
declare const serverlessConfigSchema: Type<"es" | "oblt" | "security" | "vectordb" | "workplaceai" | undefined>;
export type ServerlessConfigType = TypeOf<typeof serverlessConfigSchema>;
export declare const serverlessConfig: ServiceConfigDescriptor<ServerlessConfigType>;
export {};
