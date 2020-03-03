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

interface ComboBoxOption<T> {
  label: string;
  target: T;
}
interface ComboBoxGroupedOption<T> {
  label: string;
  options: Array<ComboBoxOption<T>>;
}

type GroupOrOption<T> = ComboBoxGroupedOption<T> | ComboBoxOption<T>;

export type ComboBoxGroupedOptions<T> = Array<GroupOrOption<T>>;

/**
 * Groups and sorts alphabetically objects and returns an array of options that are compatible with EuiComboBox options.
 *
 * @param objects An array of objects that will be grouped.
 * @param groupBy A field name which objects are grouped by.
 * @param labelName A name of a property which value will be displayed.
 *
 * @returns An array of grouped and sorted alphabetically `objects` that are compatible with EuiComboBox options.
 */
function groupAndSortBy<
  T extends Record<TGroupBy | TLabelName, string>,
  TGroupBy extends string = 'type',
  TLabelName extends string = 'title'
>(objects: T[], groupBy: TGroupBy, labelName: TLabelName): ComboBoxGroupedOptions<T> {
  const groupedOptions = objects.reduce((array, obj) => {
    const group = array.find(element => element.label === obj[groupBy]);
    const option = {
      label: obj[labelName],
      target: obj,
    };

    if (group && group.options) {
      group.options.push(option);
    } else {
      array.push({ label: obj[groupBy], options: [option] });
    }

    return array;
  }, [] as Array<ComboBoxGroupedOption<T>>);

  groupedOptions.sort(sortByLabel);

  groupedOptions.forEach(group => {
    if (Array.isArray(group.options)) {
      group.options.sort(sortByLabel);
    }
  });

  if (groupedOptions.length === 1 && !groupedOptions[0].label) {
    return groupedOptions[0].options || [];
  }

  return groupedOptions;
}

function sortByLabel<T>(a: GroupOrOption<T>, b: GroupOrOption<T>) {
  return (a.label || '').toLowerCase().localeCompare((b.label || '').toLowerCase());
}

export { groupAndSortBy };
