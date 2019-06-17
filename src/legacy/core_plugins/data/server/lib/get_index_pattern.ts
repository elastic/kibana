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

import { Request } from 'hapi';
import { StaticIndexPattern } from 'ui/index_patterns';

/**
 * Retrieve an index pattern saved object by title.
 * @param req The initial request
 * @param title The title of the index pattern
 */
export async function getIndexPattern(
  req: Request,
  title: string
): Promise<StaticIndexPattern | null> {
  const savedObjectClient = req.getSavedObjectsClient();
  const indexPatternObjects = await savedObjectClient.find({
    type: 'index-pattern',
    fields: ['title', 'type', 'fields', 'timeFieldName'],
    search: `"${title}"`,
    searchFields: ['title'],
  });
  const indexPatternObject = indexPatternObjects.saved_objects.find(
    obj => obj.attributes.title === title
  );
  if (!indexPatternObject) return null;
  const fields = JSON.parse(indexPatternObject!.attributes.fields);
  return { ...indexPatternObject!.attributes, fields };
}
