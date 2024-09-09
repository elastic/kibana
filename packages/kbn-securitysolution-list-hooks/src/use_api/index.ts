/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
  ExceptionListSchema,
  UpdateExceptionListItemSchema,
  ApiCallFindListsItemsMemoProps,
  ApiCallMemoProps,
  ApiListExportProps,
  ApiCallGetExceptionFilterFromIdsMemoProps,
  ApiCallGetExceptionFilterFromExceptionsMemoProps,
  ApiListDuplicateProps,
} from '@kbn/securitysolution-io-ts-list-types';
import * as Api from '@kbn/securitysolution-list-api';
import { getIdsAndNamespaces } from '@kbn/securitysolution-list-utils';
import type { HttpStart } from '@kbn/core-http-browser';

import { transformInput, transformNewItemOutput, transformOutput } from '../transforms';

export interface ExceptionsApi {
  addExceptionListItem: (arg: {
    listItem: CreateExceptionListItemSchema;
  }) => Promise<ExceptionListItemSchema>;
  updateExceptionListItem: (arg: {
    listItem: UpdateExceptionListItemSchema;
  }) => Promise<ExceptionListItemSchema>;
  deleteExceptionItem: (arg: ApiCallMemoProps) => Promise<void>;
  deleteExceptionList: (arg: ApiCallMemoProps) => Promise<void>;
  duplicateExceptionList: (arg: ApiListDuplicateProps) => Promise<void>;
  getExceptionItem: (
    arg: ApiCallMemoProps & { onSuccess: (arg: ExceptionListItemSchema) => void }
  ) => Promise<void>;
  getExceptionList: (
    arg: ApiCallMemoProps & { onSuccess: (arg: ExceptionListSchema) => void }
  ) => Promise<void>;
  getExceptionListsItems: (arg: ApiCallFindListsItemsMemoProps) => Promise<void>;
  getExceptionFilterFromIds: (arg: ApiCallGetExceptionFilterFromIdsMemoProps) => Promise<void>;
  getExceptionFilterFromExceptions: (
    arg: ApiCallGetExceptionFilterFromExceptionsMemoProps
  ) => Promise<void>;
  exportExceptionList: (arg: ApiListExportProps) => Promise<void>;
}

export const useApi = (http: HttpStart): ExceptionsApi => {
  return useMemo(
    (): ExceptionsApi => ({
      async addExceptionListItem({
        listItem,
      }: {
        listItem: CreateExceptionListItemSchema;
      }): Promise<ExceptionListItemSchema> {
        const abortCtrl = new AbortController();
        const sanitizedItem: CreateExceptionListItemSchema = transformNewItemOutput(listItem);

        return Api.addExceptionListItem({
          http,
          listItem: sanitizedItem,
          signal: abortCtrl.signal,
        });
      },
      async deleteExceptionItem({
        id,
        namespaceType,
        onSuccess,
        onError,
      }: ApiCallMemoProps): Promise<void> {
        const abortCtrl = new AbortController();

        try {
          await Api.deleteExceptionListItemById({
            http,
            id,
            namespaceType,
            signal: abortCtrl.signal,
          });
          onSuccess();
        } catch (error) {
          onError(error);
        }
      },
      async deleteExceptionList({
        id,
        namespaceType,
        onSuccess,
        onError,
      }: ApiCallMemoProps): Promise<void> {
        const abortCtrl = new AbortController();

        try {
          await Api.deleteExceptionListById({
            http,
            id,
            namespaceType,
            signal: abortCtrl.signal,
          });
          onSuccess();
        } catch (error) {
          onError(error);
        }
      },
      async duplicateExceptionList({
        includeExpiredExceptions,
        listId,
        namespaceType,
        onError,
        onSuccess,
      }: ApiListDuplicateProps): Promise<void> {
        const abortCtrl = new AbortController();

        try {
          const newList = await Api.duplicateExceptionList({
            http,
            includeExpiredExceptions,
            listId,
            namespaceType,
            signal: abortCtrl.signal,
          });
          onSuccess(newList);
        } catch (error) {
          onError(error);
        }
      },
      async exportExceptionList({
        id,
        includeExpiredExceptions,
        listId,
        namespaceType,
        onError,
        onSuccess,
      }: ApiListExportProps): Promise<void> {
        const abortCtrl = new AbortController();

        try {
          const blob = await Api.exportExceptionList({
            http,
            id,
            includeExpiredExceptions,
            listId,
            namespaceType,
            signal: abortCtrl.signal,
          });
          onSuccess(blob);
        } catch (error) {
          onError(error);
        }
      },
      async getExceptionItem({
        id,
        namespaceType,
        onSuccess,
        onError,
      }: ApiCallMemoProps & { onSuccess: (arg: ExceptionListItemSchema) => void }): Promise<void> {
        const abortCtrl = new AbortController();

        try {
          const item = transformInput(
            await Api.fetchExceptionListItemById({
              http,
              id,
              namespaceType,
              signal: abortCtrl.signal,
            })
          );
          onSuccess(item);
        } catch (error) {
          onError(error);
        }
      },
      async getExceptionList({
        id,
        namespaceType,
        onSuccess,
        onError,
      }: ApiCallMemoProps & { onSuccess: (arg: ExceptionListSchema) => void }): Promise<void> {
        const abortCtrl = new AbortController();

        try {
          const list = await Api.fetchExceptionListById({
            http,
            id,
            namespaceType,
            signal: abortCtrl.signal,
          });
          onSuccess(list);
        } catch (error) {
          onError(error);
        }
      },
      async getExceptionListsItems({
        lists,
        filter,
        pagination,
        showDetectionsListsOnly,
        showEndpointListsOnly,
        onSuccess,
        onError,
      }: ApiCallFindListsItemsMemoProps): Promise<void> {
        const abortCtrl = new AbortController();
        const { ids, namespaces } = getIdsAndNamespaces({
          lists,
          showDetection: showDetectionsListsOnly,
          showEndpoint: showEndpointListsOnly,
        });

        try {
          if (ids.length > 0 && namespaces.length > 0) {
            const {
              data,
              page,
              per_page: perPage,
              total,
            } = await Api.fetchExceptionListsItemsByListIds({
              filter,
              http,
              listIds: ids,
              namespaceTypes: namespaces,
              pagination,
              signal: abortCtrl.signal,
            });
            onSuccess({
              // This data transform is UI specific and useful for UI concerns
              // to compensate for the differences and preferences of how ReactJS might prefer
              // data vs. how we want to model data. View `transformInput` for more details
              exceptions: data.map((item) => transformInput(item)),
              pagination: {
                page,
                perPage,
                total,
              },
            });
          } else {
            onSuccess({
              exceptions: [],
              pagination: {
                page: 0,
                perPage: pagination.perPage != null ? pagination.perPage : 0,
                total: 0,
              },
            });
          }
        } catch (error) {
          onError(error);
        }
      },
      async getExceptionFilterFromIds({
        exceptionListIds,
        chunkSize,
        alias,
        excludeExceptions,
        onSuccess,
        onError,
      }: ApiCallGetExceptionFilterFromIdsMemoProps): Promise<void> {
        const abortCtrl = new AbortController();
        try {
          const { filter } = await Api.getExceptionFilterFromExceptionListIds({
            http,
            exceptionListIds,
            signal: abortCtrl.signal,
            chunkSize,
            alias,
            excludeExceptions,
          });
          onSuccess(filter);
        } catch (error) {
          onError(error);
        }
      },
      async getExceptionFilterFromExceptions({
        exceptions,
        chunkSize,
        alias,
        excludeExceptions,
        onSuccess,
        onError,
      }: ApiCallGetExceptionFilterFromExceptionsMemoProps): Promise<void> {
        const abortCtrl = new AbortController();
        try {
          const { filter } = await Api.getExceptionFilterFromExceptions({
            http,
            exceptions,
            signal: abortCtrl.signal,
            chunkSize,
            alias,
            excludeExceptions,
          });
          onSuccess(filter);
        } catch (error) {
          onError(error);
        }
      },
      async updateExceptionListItem({
        listItem,
      }: {
        listItem: UpdateExceptionListItemSchema;
      }): Promise<ExceptionListItemSchema> {
        const abortCtrl = new AbortController();
        const sanitizedItem: UpdateExceptionListItemSchema = transformOutput(listItem);

        return Api.updateExceptionListItem({
          http,
          listItem: sanitizedItem,
          signal: abortCtrl.signal,
        });
      },
    }),
    [http]
  );
};
