/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Type, ValidationError } from '@kbn/config-schema';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import { validateVersion } from '@kbn/object-versioning/lib/utils';
import type { Version } from '@kbn/object-versioning';

import type { ContentRegistry, StorageContext } from '../core';
import type { GetTransformsFactoryFn } from '../types';

export const validate = (input: unknown, schema: Type<any>): ValidationError | null => {
  try {
    schema.validate(input);
    return null;
  } catch (e: any) {
    return e as ValidationError;
  }
};

const validateRequestVersion = (
  requestVersion: Version | undefined,
  latestVersion: Version
): Version => {
  if (requestVersion === undefined) {
    // this should never happen as we have schema in place at the route level
    throw new Error('Request version missing');
  }

  const { result, value: requestVersionNumber } = validateVersion(requestVersion);

  if (!result) {
    throw new Error(`Invalid version [${requestVersion}]. Must be an integer.`);
  }

  if (requestVersionNumber > latestVersion) {
    throw new Error(`Invalid version. Latest version is [${latestVersion}].`);
  }

  return requestVersionNumber;
};

export const getStorageContext = ({
  contentTypeId,
  version: _version,
  ctx: { contentRegistry, requestHandlerContext, getTransformsFactory },
}: {
  contentTypeId: string;
  version?: number;
  ctx: {
    contentRegistry: ContentRegistry;
    requestHandlerContext: RequestHandlerContext;
    getTransformsFactory: GetTransformsFactoryFn;
  };
}): StorageContext => {
  const contentDefinition = contentRegistry.getDefinition(contentTypeId);
  const version = validateRequestVersion(_version, contentDefinition.version.latest);
  const storageContext: StorageContext = {
    requestHandlerContext,
    version: {
      request: version,
      latest: contentDefinition.version.latest,
    },
    utils: {
      getTransforms: getTransformsFactory(contentTypeId, version),
    },
  };
  return storageContext;
};
