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

/**
 * Output transforms are functions that will be called
 * with the form field value whenever we access the form data object. (with `form.getFormData()`)
 *
 * This allows us to have a different object/array as field `value`
 * from the desired outputed form data.
 *
 * Example:
 * ```ts
 * myField.value = [{ label: 'index_1', isSelected: true }, { label: 'index_2', isSelected: false }]
 * const serializer = (value) => (
 *   value.filter(v => v.selected).map(v => v.label)
 * );
 *
 * // When serializing the form data, the following array will be returned
 * form.getFormData() -> { myField: ['index_1'] }
 * ````
 */

import { Option } from '@elastic/eui/src/components/selectable/types';
import { SerializerFunc } from '../hook_form_lib';

/**
 * Return an array of labels of all the options that are selected
 *
 * @param value The Eui Selectable options array
 */
export const multiSelectOptionsToSelectedValue: SerializerFunc<string[]> = (
  options: Option[]
): string[] => options.filter(option => option.checked === 'on').map(option => option.label);
