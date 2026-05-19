import type { Type } from '@kbn/config-schema';
import type { PrimitiveRuntimeFieldTypes, RuntimeFieldCompositeType } from '@kbn/data-views-plugin/common';
export declare const PRIMITIVE_RUNTIME_FIELD_TYPES: PrimitiveRuntimeFieldTypes;
export declare const RUNTIME_FIELD_COMPOSITE_TYPE: RuntimeFieldCompositeType;
export declare const MAX_NAME_LENGTH = 1000;
export declare const scriptSchema: Type<string | undefined>;
export declare const primitiveTypeSchema: Type<"boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point">;
