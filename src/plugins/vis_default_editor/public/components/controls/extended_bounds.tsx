/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { ChangeEvent } from 'react';

import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isUndefined } from 'lodash';

import { useValidation } from './utils';
import { AggParamEditorProps } from '../agg_param_props';

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
  const minLabel = i18n.translate('visDefaultEditor.controls.extendedBounds.minLabel', {
    defaultMessage: 'Min',
  });

  const maxLabel = i18n.translate('visDefaultEditor.controls.extendedBounds.maxLabel', {
    defaultMessage: 'Max',
  });

  const isValid = areBoundsValid(value);
  let error;

  if (!isValid) {
    error = i18n.translate('visDefaultEditor.controls.extendedBounds.errorMessage', {
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
            onChange={(ev) => handleChange(ev, 'min')}
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
            onChange={(ev) => handleChange(ev, 'max')}
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
