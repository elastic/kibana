/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import { Version } from '@kbn/object-versioning';

import type { ContentRegistry } from '../core';
import { getServiceObjectTransformFactory, getStorageContext } from '../utils';
import { ContentClient } from './content_client';

export const getContentClientFactory =
  ({ contentRegistry }: { contentRegistry: ContentRegistry }) =>
  (contentTypeId: string) => {
    const getForRequest = ({
      requestHandlerContext,
      version,
    }: {
      requestHandlerContext: RequestHandlerContext;
      version?: Version;
    }) => {
      const storageContext = getStorageContext({
        contentTypeId,
        version,
        ctx: {
          contentRegistry,
          requestHandlerContext,
          getTransformsFactory: getServiceObjectTransformFactory,
        },
      });

      const crudInstance = contentRegistry.getCrud(contentTypeId);

      return ContentClient.create(contentTypeId, {
        storageContext,
        crudInstance,
      });
    };

    return {
      getForRequest,
    };
  };
