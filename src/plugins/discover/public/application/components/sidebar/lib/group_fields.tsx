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
import { IIndexPatternFieldList, IndexPatternField } from 'src/plugins/data/public';
import { FieldFilterState, isFieldFiltered } from './field_filter';

interface GroupedFields {
  selected: IndexPatternField[];
  popular: IndexPatternField[];
  unpopular: IndexPatternField[];
}

/**
 * group the fields into selected, popular and unpopular, filter by fieldFilterState
 */
export function groupFields(
  fields: IIndexPatternFieldList | null,
  columns: string[],
  popularLimit: number,
  fieldCounts: Record<string, number>,
  fieldFilterState: FieldFilterState
): GroupedFields {
  const result: GroupedFields = {
    selected: [],
    popular: [],
    unpopular: [],
  };
  if (!Array.isArray(fields) || !Array.isArray(columns) || typeof fieldCounts !== 'object') {
    return result;
  }

  const popular = fields
    .filter((field) => !columns.includes(field.name) && field.count)
    .sort((a: IndexPatternField, b: IndexPatternField) => (b.count || 0) - (a.count || 0))
    .map((field) => field.name)
    .slice(0, popularLimit);

  const compareFn = (a: IndexPatternField, b: IndexPatternField) => {
    if (!a.displayName) {
      return 0;
    }
    return a.displayName.localeCompare(b.displayName || '');
  };
  const fieldsSorted = fields.sort(compareFn);

  for (const field of fieldsSorted) {
    if (!isFieldFiltered(field, fieldFilterState, fieldCounts)) {
      continue;
    }
    if (columns.includes(field.name)) {
      result.selected.push(field);
    } else if (popular.includes(field.name) && field.type !== '_source') {
      result.popular.push(field);
    } else if (field.type !== '_source') {
      result.unpopular.push(field);
    }
  }

  return result;
}
