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

import { EuiComboBoxOptionProps } from '@elastic/eui';
import { AggType } from 'ui/agg_types';

type ComboBoxGroupedOption = EuiComboBoxOptionProps & {
  label: string;
  value?: AggType;
  options?: EuiComboBoxOptionProps[];
};

function groupAggregationsBy(aggs: AggType[], groupBy: string = 'type') {
  if (!Array.isArray(aggs)) {
    return [];
  }

  const groupedOptions: ComboBoxGroupedOption[] = aggs.reduce((array: AggType[], type: AggType) => {
    const group = array.find(element => element.label === type[groupBy]);
    const option = {
      label: type.title,
      value: type,
    };

    if (group) {
      group.options.push(option);
    } else {
      array.push({ label: type[groupBy], options: [option] });
    }

    return array;
  }, []);

  groupedOptions.sort(sortByLabel);

  groupedOptions.forEach((group: ComboBoxGroupedOption) => {
    if (Array.isArray(group.options)) {
      group.options.sort(sortByLabel);
    }
  });

  if (groupedOptions.length === 1 && !groupedOptions[0].label) {
    return groupedOptions[0].options;
  }

  return groupedOptions;
}

function sortByLabel(a: { label: string }, b: { label: string }) {
  return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
}

export { groupAggregationsBy, ComboBoxGroupedOption };
