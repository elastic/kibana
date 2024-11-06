/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiSelectableOption } from '@elastic/eui';
import { SerializerFunc } from '../hook_form_lib';

type FuncType = (selectOptions: EuiSelectableOption[]) => SerializerFunc;

export const multiSelectComponent: Record<string, FuncType> = {
  // This deSerializer takes the previously selected options and map them
  // against the default select options values.
  selectedValueToOptions(selectOptions) {
    return (defaultFormValue) => {
      // If there are no default form value, it means that no previous value has been selected.
      if (!defaultFormValue) {
        return selectOptions;
      }

      return (selectOptions as EuiSelectableOption[]).map((option) => ({
        ...option,
        checked: (defaultFormValue as string[]).includes(option.label) ? 'on' : undefined,
      }));
    };
  },
};
