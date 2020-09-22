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

import { i18n } from '@kbn/i18n';

interface FailedShards {
  shard: number;
  index: string;
  node: string;
  reason: {
    type: string;
    reason: string;
    script_stack: string[];
    script: string;
    lang: string;
    position: {
      offset: number;
      start: number;
      end: number;
    };
    caused_by: {
      type: string;
      reason: string;
    };
  };
}

interface EsError {
  body: {
    statusCode: number;
    error: string;
    message: string;
    attributes?: {
      error?: {
        root_cause?: [
          {
            lang: string;
            script: string;
          }
        ];
        type: string;
        reason: string;
        caused_by: {
          type: string;
          reason: string;
          phase: string;
          grouped: boolean;
          failed_shards: FailedShards[];
        };
      };
    };
  };
}

export function getCause(error: EsError) {
  const cause = error.body?.attributes?.error?.root_cause;
  if (cause) {
    return cause[0];
  }

  const failedShards = error.body?.attributes?.error?.caused_by?.failed_shards;

  if (failedShards && failedShards[0] && failedShards[0].reason) {
    return error.body?.attributes?.error?.caused_by?.failed_shards[0].reason;
  }
}

export function getPainlessError(error: EsError) {
  const cause = getCause(error);

  if (!cause) {
    return;
  }

  const { lang, script } = cause;

  if (lang !== 'painless') {
    return;
  }

  return {
    lang,
    script,
    message: i18n.translate('discover.painlessError.painlessScriptedFieldErrorMessage', {
      defaultMessage: "Error with Painless scripted field '{script}'.",
      values: { script },
    }),
    error: error.body?.message,
  };
}
