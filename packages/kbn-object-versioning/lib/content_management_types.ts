/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ObjectTransforms, Version, VersionableObject } from './types';

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

export interface ServiceTransforms {
  get: {
    in: {
      options: ObjectTransforms;
    };
    out: {
      result: ObjectTransforms;
    };
  };
  bulkGet: {
    in: {
      options: ObjectTransforms;
    };
    out: {
      result: ObjectTransforms;
    };
  };
  create: {
    in: {
      data: ObjectTransforms;
      options: ObjectTransforms;
    };
    out: {
      result: ObjectTransforms;
    };
  };
  update: {
    in: {
      data: ObjectTransforms;
      options: ObjectTransforms;
    };
    out: {
      result: ObjectTransforms;
    };
  };
  delete: {
    in: {
      options: ObjectTransforms;
    };
    out: {
      result: ObjectTransforms;
    };
  };
  search: {
    in: {
      query: ObjectTransforms;
      options: ObjectTransforms;
    };
    out: {
      result: ObjectTransforms;
    };
  };
}

export interface ServiceDefinitionVersioned {
  [version: Version]: ServicesDefinition;
}
