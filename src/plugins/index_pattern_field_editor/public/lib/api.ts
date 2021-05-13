/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { HttpSetup } from 'src/core/public';
import { API_BASE_PATH } from '../../common/constants';
import { useRequest, UseRequestResponse } from '../shared_imports';

export const initApi = (httpClient: HttpSetup) => {
  const usePreviewField = ({
    index,
    script,
    document,
  }: {
    index: string;
    script: string | null;
    document: Record<string, any>;
  }): UseRequestResponse => {
    return useRequest(httpClient, {
      method: 'post',
      path: `${API_BASE_PATH}/field_preview`,
      body: {
        index,
        script,
        document,
      },
    });
  };

  return {
    usePreviewField,
  };
};

export type ApiService = ReturnType<typeof initApi>;
