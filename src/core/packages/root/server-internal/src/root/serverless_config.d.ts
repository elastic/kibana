import type { TypeOf } from '@kbn/config-schema';
import { type Type } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
declare const serverlessConfigSchema: Type<"security" | "oblt" | "es" | "workplaceai" | "vectordb" | undefined>;
export type ServerlessConfigType = TypeOf<typeof serverlessConfigSchema>;
export declare const serverlessConfig: ServiceConfigDescriptor<ServerlessConfigType>;
export {};
