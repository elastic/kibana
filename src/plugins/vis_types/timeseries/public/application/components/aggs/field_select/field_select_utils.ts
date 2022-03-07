/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiComboBoxOptionOption, EuiComboBoxProps } from '@elastic/eui';
import { isFieldEnabled } from '../../../../../common/check_ui_restrictions';

import type { SanitizedFieldType } from '../../../../..//common/types';
import type { TimeseriesUIRestrictions } from '../../../../../common/ui_restrictions';

export const INVALID_FIELD_ID = 'INVALID_FIELD';
export const MAX_MULTI_FIELDS_ITEMS = 4;

export const getGroupedOptions = (
  type: string,
  selectedIds: Array<string | null>,
  fields: SanitizedFieldType[] = [],
  uiRestrictions: TimeseriesUIRestrictions | undefined,
  restrict: string[] = []
): EuiComboBoxProps<string>['options'] => {
  const isFieldTypeEnabled = (fieldType: string) =>
    restrict.length ? restrict.includes(fieldType) : true;

  const sortByLabel = (a: EuiComboBoxOptionOption<string>, b: EuiComboBoxOptionOption<string>) => {
    const getNormalizedString = (option: EuiComboBoxOptionOption<string>) =>
      (option.label || '').toLowerCase();

    return getNormalizedString(a).localeCompare(getNormalizedString(b));
  };

  const groupedOptions: EuiComboBoxProps<string>['options'] = Object.values(
    fields.reduce<Record<string, EuiComboBoxOptionOption<string>>>((acc, field) => {
      if (isFieldTypeEnabled(field.type) && isFieldEnabled(field.name, type, uiRestrictions)) {
        const item: EuiComboBoxOptionOption<string> = {
          value: field.name,
          label: field.label ?? field.name,
          disabled: selectedIds.includes(field.name),
        };

        const fieldTypeOptions = acc[field.type]?.options;

        if (fieldTypeOptions) {
          fieldTypeOptions.push(item);
        } else {
          acc[field.type] = {
            options: [item],
            label: field.type,
          };
        }
      }

      return acc;
    }, {})
  );

  // sort groups
  groupedOptions.sort(sortByLabel);

  // sort items
  groupedOptions.forEach((group) => {
    if (Array.isArray(group.options)) {
      group.options.sort(sortByLabel);
    }
  });

  return groupedOptions;
};

export const findInGroupedOptions = (
  groupedOptions: EuiComboBoxProps<string>['options'],
  fieldName: string
) =>
  (groupedOptions || [])
    .map((i) => i.options)
    .flat()
    .find((i) => i?.value === fieldName);

export const updateItem = (
  existingItems: Array<string | null>,
  value: string | null = null,
  index: number = 0
) => {
  const arr = [...existingItems];
  arr[index] = value;
  return arr;
};

export const addNewItem = (existingItems: Array<string | null>, insertAfter: number = 0) => {
  const arr = [...existingItems];
  arr.splice(insertAfter + 1, 0, null);
  return arr;
};

export const deleteItem = (existingItems: Array<string | null>, index: number = 0) =>
  existingItems.filter((item, i) => i !== index);

export const swapItems = (
  existingItems: Array<string | null>,
  source: number = 0,
  destination: number = 0
) => {
  const arr = [...existingItems];
  arr.splice(destination, 0, arr.splice(source, 1)[0]);
  return arr;
};
