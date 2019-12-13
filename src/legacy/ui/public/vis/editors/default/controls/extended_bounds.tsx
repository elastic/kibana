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

import React, { ChangeEvent } from 'react';

import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isUndefined } from 'lodash';
import { useValidation } from './agg_utils';
import { AggParamEditorProps } from '..';

export interface Bounds {
  min: number | '';
  max: number | '';
}

function areBoundsValid({ min, max }: Bounds): boolean {
  if (min === '' || max === '') {
    return false;
  }

  return max >= min;
}

function ExtendedBoundsParamEditor({
  value = {} as Bounds,
  setValue,
  setValidity,
  showValidation,
  setTouched,
}: AggParamEditorProps<Bounds>) {
  const minLabel = i18n.translate('data.search.aggs.extendedBounds.minLabel', {
    defaultMessage: 'Min',
  });

  const maxLabel = i18n.translate('data.search.aggs.extendedBounds.maxLabel', {
    defaultMessage: 'Max',
  });

  const isValid = areBoundsValid(value);
  let error;

  if (!isValid) {
    error = i18n.translate('data.search.aggs.extendedBounds.errorMessage', {
      defaultMessage: 'Min should be less than or equal to Max.',
    });
  }

  useValidation(setValidity, isValid);

  const handleChange = (ev: ChangeEvent<HTMLInputElement>, name: string) => {
    setValue({
      ...value,
      [name]: ev.target.value === '' ? '' : parseFloat(ev.target.value),
    });
  };

  return (
    <EuiFormRow fullWidth={true} isInvalid={showValidation ? !isValid : false} error={error}>
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiFieldNumber
            value={isUndefined(value.min) ? '' : value.min}
            onChange={ev => handleChange(ev, 'min')}
            onBlur={setTouched}
            fullWidth={true}
            isInvalid={showValidation ? !isValid : false}
            aria-label={minLabel}
            prepend={minLabel}
            compressed
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFieldNumber
            value={isUndefined(value.max) ? '' : value.max}
            onChange={ev => handleChange(ev, 'max')}
            onBlur={setTouched}
            fullWidth={true}
            isInvalid={showValidation ? !isValid : false}
            aria-label={maxLabel}
            prepend={maxLabel}
            compressed
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
}

export { ExtendedBoundsParamEditor };
