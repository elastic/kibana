/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { HttpStart } from 'src/core/public';
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
    .post('/internal/index-pattern-management/preview_scripted_field', {
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
