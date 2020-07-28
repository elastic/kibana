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
import { difference, map } from 'lodash';
import { IndexPattern, IndexPatternField } from 'src/plugins/data/public';
import { DiscoverServices } from '../../../../build_services';

export function getIndexPatternFieldList(
  indexPattern: IndexPattern,
  fieldCounts: Record<string, number>,
  { data }: DiscoverServices
) {
  if (!indexPattern || !fieldCounts) return data.indexPatterns.createFieldList(indexPattern);

  const fieldSpecs = indexPattern.fields.slice(0);
  const fieldNamesInDocs = Object.keys(fieldCounts);
  const fieldNamesInIndexPattern = map(indexPattern.fields, 'name');

  difference(fieldNamesInDocs, fieldNamesInIndexPattern).forEach((unknownFieldName) => {
    fieldSpecs.push({
      name: String(unknownFieldName),
      type: 'unknown',
    } as IndexPatternField);
  });

  return data.indexPatterns.createFieldList(indexPattern, fieldSpecs);
}
