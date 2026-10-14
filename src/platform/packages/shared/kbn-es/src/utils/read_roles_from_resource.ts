/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import { extname } from 'path';
import { parse as parseYaml } from 'yaml';

export const readRolesFromResource = (resourcePath: string) => {
  if (!fs.existsSync(resourcePath) || extname(resourcePath) !== '.yml') {
    throw new Error(`${resourcePath} does not exist or not a yml file`);
  }
  const data = parseYaml(fs.readFileSync(resourcePath, 'utf8'));
  if (typeof data === 'object' && data !== null) {
    return Object.keys(data);
  } else {
    throw new Error(`expected ${resourcePath} file to parse to an object`);
  }
};

/**
 * Elasticsearch reserves metadata keys that start with `_` (e.g. `_public` and `_reserved` that mark
 * serverless predefined roles) and rejects them in role descriptors passed to its APIs, such as
 * API key creation or role updates.
 */
const RESERVED_METADATA_PREFIX = '_';

const stripReservedMetadata = (descriptor: unknown) => {
  if (typeof descriptor !== 'object' || descriptor === null || !('metadata' in descriptor)) {
    return descriptor;
  }

  const { metadata, ...rest } = descriptor as { metadata: unknown };
  if (typeof metadata !== 'object' || metadata === null) {
    return descriptor;
  }

  const publicMetadata = Object.fromEntries(
    Object.entries(metadata).filter(([key]) => !key.startsWith(RESERVED_METADATA_PREFIX))
  );
  return Object.keys(publicMetadata).length > 0 ? { ...rest, metadata: publicMetadata } : rest;
};

/**
 * Reads role descriptors from a roles file so that they can be passed to Elasticsearch APIs. The
 * reserved metadata keys Elasticsearch itself reads from the file are dropped, as these APIs reject
 * them.
 */
export const readRolesDescriptorsFromResource = (resourcePath: string) => {
  if (!fs.existsSync(resourcePath) || extname(resourcePath) !== '.yml') {
    throw new Error(`${resourcePath} does not exist or not a yml file`);
  }
  const data = parseYaml(fs.readFileSync(resourcePath, 'utf8'));
  if (typeof data === 'object' && data !== null) {
    return Object.fromEntries(
      Object.entries(data).map(([name, descriptor]) => [name, stripReservedMetadata(descriptor)])
    );
  } else {
    throw new Error(`expected ${resourcePath} file to parse to an object`);
  }
};
