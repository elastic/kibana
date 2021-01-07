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

import { Query } from '@elastic/eui';

interface ParsedQuery {
  queryText?: string;
  visibleTypes?: string[];
  selectedTags?: string[];
}

export function parseQuery(query: Query): ParsedQuery {
  let queryText: string | undefined;
  let visibleTypes: string[] | undefined;
  let selectedTags: string[] | undefined;

  if (query) {
    if (query.ast.getTermClauses().length) {
      queryText = query.ast
        .getTermClauses()
        .map((clause: any) => clause.value)
        .join(' ');
    }
    if (query.ast.getFieldClauses('type')) {
      visibleTypes = query.ast.getFieldClauses('type')[0].value as string[];
    }
    if (query.ast.getFieldClauses('tag')) {
      selectedTags = query.ast.getFieldClauses('tag')[0].value as string[];
    }
  }

  return {
    queryText,
    visibleTypes,
    selectedTags,
  };
}
