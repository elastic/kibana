/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpStart } from '@kbn/core/public';
import { ExecuteScriptParams, ExecuteScriptResult } from '../types';

export const executeScript = async ({
  name,
  script,
  indexPatternTitle,
  query,
  additionalFields = [],
  http,
}: ExecuteScriptParams): Promise<ExecuteScriptResult> => {
  return http
    .post<{
      statusCode: ExecuteScriptResult['status'];
      body: { hits: ExecuteScriptResult['hits'] };
    }>('/internal/index-pattern-management/preview_scripted_field', {
      body: JSON.stringify({
        index: indexPatternTitle,
        name,
        script,
        query,
        additionalFields,
      }),
    })
    .then((res) => ({
      status: res.statusCode,
      hits: res.body.hits,
    }))
    .catch((err) => ({
      status: err.statusCode,
      error: err.body.attributes.error,
    }));
};

export const isScriptValid = async ({
  name,
  script,
  indexPatternTitle,
  http,
}: {
  name: string;
  script: string;
  indexPatternTitle: string;
  http: HttpStart;
}) => {
  const scriptResponse = await executeScript({
    name,
    script,
    indexPatternTitle,
    http,
  });

  if (scriptResponse.status !== 200) {
    return false;
  }

  return true;
};
