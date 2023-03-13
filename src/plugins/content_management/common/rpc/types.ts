/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Type } from '@kbn/config-schema';
import type { VersionableObject } from '@kbn/object-versioning';

export interface ProcedureSchemas {
  in: Type<any> | false;
  out?: Type<any> | false;
}

export interface ServicesDefinition {
  get?: {
    in?: {
      options?: VersionableObject;
    };
    out?: {
      result?: VersionableObject;
    };
  };
  bulkGet?: {
    in?: {
      options?: VersionableObject;
    };
    out?: {
      result?: VersionableObject;
    };
  };
  create?: {
    in?: {
      data?: VersionableObject;
      options?: VersionableObject;
    };
    out?: {
      result?: VersionableObject;
    };
  };
  update?: {
    in?: {
      data?: VersionableObject;
      options?: VersionableObject;
    };
    out?: {
      result?: VersionableObject;
    };
  };
  delete?: {
    in?: {
      options?: VersionableObject;
    };
    out?: {
      result?: VersionableObject;
    };
  };
  search?: {
    in?: {
      query?: VersionableObject;
      options?: VersionableObject;
    };
    out?: {
      result?: VersionableObject;
    };
  };
}
