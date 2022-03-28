/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { HttpSetup } from 'src/core/public';
import { API_BASE_PATH } from '../../common/constants';
import { sendRequest } from '../shared_imports';
import { PainlessExecuteContext, FieldPreviewResponse } from '../components/preview';

export const initApi = (httpClient: HttpSetup) => {
  const getFieldPreview = ({
    index,
    context,
    script,
    document,
  }: {
    index: string;
    context: PainlessExecuteContext;
    script: { source: string } | null;
    document: Record<string, any>;
  }) => {
    return sendRequest<FieldPreviewResponse>(httpClient, {
      path: `${API_BASE_PATH}/field_preview`,
      method: 'post',
      body: {
        index,
        context,
        script,
        document,
      },
    });
  };

  return {
    getFieldPreview,
  };
};

export type ApiService = ReturnType<typeof initApi>;
