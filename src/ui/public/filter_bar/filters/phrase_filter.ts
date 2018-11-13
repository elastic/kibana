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

import { isEmpty, pick } from 'lodash';
import { Filter } from 'ui/filter_bar/filters/index';

export type PhraseFilter = Filter & {
  field: string;
  value: string | number;
  applyChanges: (updateObject: Partial<PhraseFilter>) => PhraseFilter;
};

interface CreatePhraseFilterOptions {
  field: string;
  value: string | number;
}

export function createPhraseFilter(options: CreatePhraseFilterOptions): PhraseFilter {
  const { field, value } = options;
  return {
    type: 'PhraseFilter',
    field,
    value,
    toElasticsearchQuery() {
      // TODO implement me
      return {};
    },
    applyChanges(updateObject: Partial<PhraseFilter>) {
      if (isEmpty(updateObject)) {
        return this;
      }

      const props = ['field', 'value'];
      const updatedProps = pick(updateObject, props);
      const currentProps = pick(this, props);
      const mergedProps = {
        ...currentProps,
        ...updatedProps,
      } as CreatePhraseFilterOptions;

      return createPhraseFilter(mergedProps);
    },
  };
}
