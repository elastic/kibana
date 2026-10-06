/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';
import type { IContext } from '../context';
export declare const stripBadDefault: (schema: OpenAPIV3.SchemaObject) => void;
export declare const processDeprecated: (schema: OpenAPIV3.SchemaObject) => void;
export declare const processDiscontinued: (schema: OpenAPIV3.SchemaObject) => void;
export declare const processAvailability: (ctx: IContext, schema: OpenAPIV3.SchemaObject) => void;
/** Just for type convenience */
export declare const deleteField: (schema: object, field: string) => void;
export declare const isAnyType: (schema: OpenAPIV3.SchemaObject) => boolean;
/** OAS 3.0 requires `null` to appear in `enum` when `nullable: true`. */
export declare const ensureNullableEnumIncludesNull: (schema: OpenAPIV3.SchemaObject) => void;
/** Assumes ref is in the form of "#/components/schemas/my-schema-my-team" */
export declare const getIdFromRefString: (ref: string) => string;
