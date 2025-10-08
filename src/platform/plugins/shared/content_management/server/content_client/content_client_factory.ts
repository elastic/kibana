/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger, KibanaRequest } from '@kbn/core/server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { Version } from '@kbn/object-versioning';

import type { MSearchIn, MSearchOut } from '../../common';
import type { ContentRegistry, StorageContext } from '../core';
import type { MSearchService } from '../core/msearch';
import { getServiceObjectTransformFactory, getStorageContext } from '../utils';
import { ContentClient } from './content_client';

export const getContentClientFactory =
  ({ contentRegistry }: { contentRegistry: ContentRegistry }) =>
  (contentTypeId: string) => {
    const getForRequest = <T = unknown>({
      request,
      requestHandlerContext,
      version,
    }: {
      request: KibanaRequest;
      requestHandlerContext: RequestHandlerContext;
      version?: Version;
    }) => {
      const contentDefinition = contentRegistry.getDefinition(contentTypeId);

      const storageContext = getStorageContext({
        contentTypeId,
        request,
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
    logger,
  }: {
    contentRegistry: ContentRegistry;
    mSearchService: MSearchService;
    logger: Logger;
  }) =>
  ({
    requestHandlerContext,
    request,
  }: {
    requestHandlerContext: RequestHandlerContext;
    request: KibanaRequest;
  }) => {
    const msearch = async ({ contentTypes, query }: MSearchIn): Promise<MSearchOut> => {
      const contentTypesWithStorageContext = contentTypes.reduce<
        Array<{ contentTypeId: string; ctx: StorageContext }>
      >((acc, { contentTypeId, version }) => {
        const contentDefinition = contentRegistry.getDefinition(contentTypeId);

        if (contentDefinition.storage.mSearch) {
          const storageContext = getStorageContext({
            request,
            contentTypeId,
            version: version ?? contentDefinition.version.latest,
            ctx: {
              contentRegistry,
              requestHandlerContext,
              getTransformsFactory: getServiceObjectTransformFactory,
            },
          });
          acc.push({
            contentTypeId,
            ctx: storageContext,
          });
        } else {
          logger.warn(`mSearch method missing for content type "${contentTypeId}" v${version}.`);
        }

        return acc;
      }, []);

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
