/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HttpSetup } from '@kbn/core/public';
import {
  FIELD_PREVIEW_PATH as path,
  INITIAL_REST_VERSION as version,
} from '../../common/constants';
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
    document: Record<string, unknown>;
  }) => {
    return sendRequest<FieldPreviewResponse>(httpClient, {
      path,
      method: 'post',
      body: {
        index,
        context,
        script,
        document,
      },
      version,
    });
  };

  return {
    getFieldPreview,
  };
};

export type ApiService = ReturnType<typeof initApi>;
