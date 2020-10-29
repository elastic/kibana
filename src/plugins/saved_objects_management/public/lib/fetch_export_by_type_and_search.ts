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

import { HttpStart, SavedObjectsFindOptionsReference } from 'src/core/public';

export async function fetchExportByTypeAndSearch({
  http,
  search,
  types,
  references,
  includeReferencesDeep = false,
}: {
  http: HttpStart;
  types: string[];
  search?: string;
  references?: SavedObjectsFindOptionsReference[];
  includeReferencesDeep?: boolean;
}): Promise<Blob> {
  return http.post('/api/saved_objects/_export', {
    body: JSON.stringify({
      type: types,
      search,
      hasReference: references,
      includeReferencesDeep,
    }),
  });
}
