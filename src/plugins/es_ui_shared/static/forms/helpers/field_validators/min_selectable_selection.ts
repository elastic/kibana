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

import { Option } from '@elastic/eui/src/components/selectable/types';

import { ValidationFunc, ValidationError } from '../../hook_form_lib';
import { hasMinLengthArray } from '../../../validators/array';
import { multiSelectComponent } from '../serializers';
import { ERROR_CODE } from './types';

const { optionsToSelectedValue } = multiSelectComponent;

/**
 * Validator to validate that a EuiSelectable has a minimum number
 * of items selected.
 * @param total Minimum number of items
 */
export const minSelectableSelectionField = ({
  total = 0,
  message,
}: {
  total: number;
  message: string | ((err: Partial<ValidationError>) => string);
}) => (...args: Parameters<ValidationFunc>): ReturnType<ValidationFunc<any, ERROR_CODE>> => {
  const [{ value }] = args;

  // We need to convert all the options from the multi selectable component, to the
  // an actual Array of selection _before_ validating the Array length.
  return hasMinLengthArray(total)(optionsToSelectedValue(value as Option[]))
    ? undefined
    : {
        code: 'ERR_MIN_SELECTION',
        total,
        message: typeof message === 'function' ? message({ length }) : message,
      };
};
