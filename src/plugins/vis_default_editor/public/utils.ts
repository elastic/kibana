/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

interface ComboBoxOption<T> {
  key?: string;
  label: string;
  target: T;
}
interface ComboBoxGroupedOption<T> {
  key?: string;
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
export function groupAndSortBy<
  T extends Record<TGroupBy | TLabelName | TKeyName, string>,
  TGroupBy extends string = 'type',
  TLabelName extends string = 'title',
  TKeyName extends string = never
>(
  objects: T[],
  groupBy: TGroupBy,
  labelName: TLabelName,
  keyName?: TKeyName
): ComboBoxGroupedOptions<T> {
  const groupedOptions = objects.reduce((array, obj) => {
    const group = array.find((element) => element.label === obj[groupBy]);
    const option = {
      label: obj[labelName],
      target: obj,
      ...(keyName ? { key: obj[keyName] } : {}),
    };

    if (group && group.options) {
      group.options.push(option);
    } else {
      array.push({ label: obj[groupBy], options: [option] });
    }

    return array;
  }, [] as Array<ComboBoxGroupedOption<T>>);

  groupedOptions.sort(sortByLabel);

  groupedOptions.forEach((group) => {
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
