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
