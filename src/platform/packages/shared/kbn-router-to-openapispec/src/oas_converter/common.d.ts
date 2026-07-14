import type { OpenAPIV3 } from 'openapi-types';
export declare const trimTrailingStar: (str: string) => string;
export declare const validatePathParameters: (pathParameters: string[], schemaKeys: string[]) => void;
export declare const isReferenceObject: (schema: unknown) => schema is OpenAPIV3.ReferenceObject;
