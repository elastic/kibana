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

import { kfetch } from 'ui/kfetch';

export const executeScript = async ({
  name,
  lang,
  script,
  indexPatternTitle,
  query,
  additionalFields = [],
}) => {
  // Using _msearch because _search with index name in path dorks everything up
  const header = {
    index: indexPatternTitle,
    ignore_unavailable: true,
  };

  const search = {
    query: {
      match_all: {},
    },
    script_fields: {
      [name]: {
        script: {
          lang,
          source: script,
        },
      },
    },
    size: 10,
    timeout: '30s',
  };

  if (additionalFields.length > 0) {
    search._source = additionalFields;
  }

  if (query) {
    search.query = query;
  }

  const body = `${JSON.stringify(header)}\n${JSON.stringify(search)}\n`;
  const esResp = await kfetch({ method: 'POST', pathname: '/elasticsearch/_msearch', body });
  // unwrap _msearch response
  return esResp.responses[0];
};

export const isScriptValid = async ({ name, lang, script, indexPatternTitle }) => {
  const scriptResponse = await executeScript({ name, lang, script, indexPatternTitle });

  if (scriptResponse.status !== 200) {
    return false;
  }

  return true;
};
