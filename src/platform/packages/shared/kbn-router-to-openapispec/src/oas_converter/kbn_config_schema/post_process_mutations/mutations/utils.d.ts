import type { OpenAPIV3 } from 'openapi-types';
import type { IContext } from '../context';
export declare const stripBadDefault: (schema: OpenAPIV3.SchemaObject) => void;
export declare const processDeprecated: (schema: OpenAPIV3.SchemaObject) => void;
export declare const processDiscontinued: (schema: OpenAPIV3.SchemaObject) => void;
export declare const processAvailability: (ctx: IContext, schema: OpenAPIV3.SchemaObject) => void;
/** Just for type convenience */
export declare const deleteField: (schema: object, field: string) => void;
export declare const isAnyType: (schema: OpenAPIV3.SchemaObject) => boolean;
/** Assumes ref is in the form of "#/components/schemas/my-schema-my-team" */
export declare const getIdFromRefString: (ref: string) => string;
