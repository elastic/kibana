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
export declare const processString: (schema: OpenAPIV3.SchemaObject) => void;
export declare const processStream: (schema: OpenAPIV3.SchemaObject) => void;
export declare const processRecord: (ctx: IContext, schema: OpenAPIV3.SchemaObject) => void;
export declare const processMap: (ctx: IContext, schema: OpenAPIV3.SchemaObject) => void;
export declare const processAllTypes: (ctx: IContext, schema: OpenAPIV3.SchemaObject) => void;
export declare const processAnyType: (schema: OpenAPIV3.SchemaObject) => void;
export { processObject } from './object';
export { processEnum } from './enum';
export { processDiscriminator } from './discriminator';
