/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import { OpenAPIV3 } from 'openapi-types';
import * as core from 'zod/v4/core'; // or import type from 'openapi-types'

import { ZodType } from 'zod/v4'; // or import from 'zod' if using a different version

type OpenAPIMetadata = Partial<OpenAPIV3.SchemaObject>;
const OPENAPI_META_KEY = '_openapi';
const OMIT_FROM_OPENAPI_KEY = '_openapi_omit';

declare module 'zod/v4' {
  interface ZodTypeDef {
    [OPENAPI_META_KEY]?: OpenAPIMetadata;
  }

  interface ZodType<
    out Output = unknown,
    out Input = unknown,
    out Internals extends core.$ZodTypeInternals<Output, Input> = core.$ZodTypeInternals<
      Output,
      Input
    >
  > extends core.$ZodType<Output, Input, Internals> {
    openapi(metadata: OpenAPIMetadata): this;
    getOpenAPIMetadata(): OpenAPIMetadata | undefined;
    omitFromOpenAPI(shouldOmit?: boolean): this;
    isOmittedFromOpenAPI(): boolean;
  }
}

// Inject methods into Zod prototype
ZodType.prototype.openapi = function (metadata: OpenAPIMetadata): ZodType {
  const prevMeta = this.def[OPENAPI_META_KEY] || {};
  this.def[OPENAPI_META_KEY] = { ...prevMeta, ...metadata };
  return this;
};

ZodType.prototype.getOpenAPIMetadata = function (): OpenAPIMetadata | undefined {
  return this.def[OPENAPI_META_KEY];
};

ZodType.prototype.omitFromOpenAPI = function (shouldOmit: boolean = true): ZodType {
  this.def[OMIT_FROM_OPENAPI_KEY] = shouldOmit;
  return this;
};

ZodType.prototype.isOmittedFromOpenAPI = function (): boolean {
  return Boolean(this.def[OMIT_FROM_OPENAPI_KEY]);
};
