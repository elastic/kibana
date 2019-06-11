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

import { SearchSource } from 'ui/courier';
import { Doc700 } from './types';

interface Pre70Filter {
  meta?: {
    index?: string;
    indexRefName: string;
  };
}

export function migrateIndexPattern700(doc: Doc700): Doc700 {
  if (
    !doc.attributes ||
    !doc.attributes.kibanaSavedObjectMeta ||
    !doc.attributes.kibanaSavedObjectMeta.searchSourceJSON
  ) {
    return doc;
  }

  const searchSourceJSON = doc.attributes.kibanaSavedObjectMeta.searchSourceJSON;
  if (typeof searchSourceJSON !== 'string') {
    return doc;
  }

  let searchSource;
  try {
    searchSource = JSON.parse(searchSourceJSON) as SearchSource;
  } catch (e) {
    // Let it go, the data is invalid and we'll leave it as is
    return doc;
  }
  if (searchSource.index) {
    searchSource.indexRefName = 'kibanaSavedObjectMeta.searchSourceJSON.index';
    doc.references.push({
      name: searchSource.indexRefName,
      type: 'index-pattern',
      id: searchSource.index,
    });
    delete searchSource.index;
  }
  if (searchSource.filter) {
    searchSource.filter.forEach((filterRow: Pre70Filter, i: number) => {
      if (!filterRow.meta || !filterRow.meta.index) {
        return;
      }
      filterRow.meta.indexRefName = `kibanaSavedObjectMeta.searchSourceJSON.filter[${i}].meta.index`;
      doc.references.push({
        name: filterRow.meta.indexRefName,
        type: 'index-pattern',
        id: filterRow.meta.index,
      });
      delete filterRow.meta.index;
    });
  }
  doc.attributes.kibanaSavedObjectMeta.searchSourceJSON = JSON.stringify(searchSource);
  return doc;
}
