/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { Version } from '@kbn/object-versioning';

import type { MSearchIn, MSearchOut } from '../../common';
import type { ContentRegistry } from '../core';
import { MSearchService } from '../core/msearch';
import { getServiceObjectTransformFactory, getStorageContext } from '../utils';
import { ContentClient } from './content_client';

export const getContentClientFactory =
  ({ contentRegistry }: { contentRegistry: ContentRegistry }) =>
  (contentTypeId: string) => {
    const getForRequest = <T = unknown>({
      requestHandlerContext,
      version,
    }: {
      requestHandlerContext: RequestHandlerContext;
      request: KibanaRequest;
      version?: Version;
    }) => {
      const contentDefinition = contentRegistry.getDefinition(contentTypeId);

      const storageContext = getStorageContext({
        contentTypeId,
        version: version ?? contentDefinition.version.latest,
        ctx: {
          contentRegistry,
          requestHandlerContext,
          getTransformsFactory: getServiceObjectTransformFactory,
        },
      });

      const crudInstance = contentRegistry.getCrud<T>(contentTypeId);

      return ContentClient.create<T>(contentTypeId, {
        storageContext,
        crudInstance,
      });
    };

    return {
      /**
       * Client getter to interact with the registered content type.
       */
      getForRequest,
    };
  };

export const getMSearchClientFactory =
  ({
    contentRegistry,
    mSearchService,
  }: {
    contentRegistry: ContentRegistry;
    mSearchService: MSearchService;
  }) =>
  ({
    requestHandlerContext,
  }: {
    requestHandlerContext: RequestHandlerContext;
    request: KibanaRequest;
  }) => {
    const msearch = async ({ contentTypes, query }: MSearchIn): Promise<MSearchOut> => {
      const contentTypesWithStorageContext = contentTypes.map(({ contentTypeId, version }) => {
        const contentDefinition = contentRegistry.getDefinition(contentTypeId);

        const storageContext = getStorageContext({
          contentTypeId,
          version: version ?? contentDefinition.version.latest,
          ctx: {
            contentRegistry,
            requestHandlerContext,
            getTransformsFactory: getServiceObjectTransformFactory,
          },
        });

        return {
          contentTypeId,
          ctx: storageContext,
        };
      });

      const result = await mSearchService.search(contentTypesWithStorageContext, query);

      return {
        contentTypes,
        result,
      };
    };

    return {
      msearch,
    };
  };
