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

import { IndexPattern, IndexPatternsService } from '../../../../data/public';

/*
 * This function is just used by Discover and it's high likely to be removed in the near future
 * It doesn't use the save function to skip the error message that's displayed when
 * a user adds several columns in a higher frequency that the changes can be persisted to ES
 * resulting in 409 errors
 */

async function popularizeField(
  indexPattern: IndexPattern,
  fieldName: string,
  indexPatternsService: IndexPatternsService
) {
  if (!indexPattern.id) return;
  const field = indexPattern.fields.getByName(fieldName);
  if (!field) {
    return;
  }

  field.count++;
  await indexPatternsService.updateSavedObject(indexPattern, 0, true).catch();
}

export { popularizeField };
