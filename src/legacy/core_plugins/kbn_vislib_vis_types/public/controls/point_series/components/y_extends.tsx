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

import React, { useEffect } from 'react';
import { EuiFormErrorText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { Scale, ValueAxis } from '../../../types';
import { NumberInputOption } from '../../number_input';

const rangeError = i18n.translate(
  'kbnVislibVisTypes.controls.pointSeries.valueAxes.minErrorMessage',
  { defaultMessage: 'Min should be less than Max.' }
);
const minError = i18n.translate(
  'kbnVislibVisTypes.controls.pointSeries.valueAxes.minNeededScaleText',
  {
    defaultMessage: 'Min must exceed 0 when a log scale is selected.',
  }
);

function areExtendsValid(min: number | '' = '', max: number | '' = ''): boolean {
  if (min === '' || max === '') {
    return true;
  }

  return max > min;
}

interface YExtendsProps {
  scale: Scale;
  setValue: <T extends keyof ValueAxis['scale']>(
    paramName: T,
    value: ValueAxis['scale'][T]
  ) => void;
  setValidity: (isValid: boolean) => void;
}

function YExtends({ scale, setValue, setValidity }: YExtendsProps) {
  const { min, max, type } = scale;
  const errors = [];

  if (!areExtendsValid(min, max)) {
    errors.push(rangeError);
  }

  if (type === 'log' && (min === undefined || min <= 0)) {
    errors.push(minError);
  }

  const isValid = !errors.length;

  useEffect(() => {
    setValidity(isValid);

    return () => setValidity(true);
  }, [isValid]);

  return (
    <>
      <NumberInputOption
        label={i18n.translate('kbnVislibVisTypes.controls.pointSeries.valueAxes.maxLabel', {
          defaultMessage: 'Max',
        })}
        step={0.1}
        paramName="max"
        value={max}
        setValue={setValue}
      />
      <NumberInputOption
        label={i18n.translate('kbnVislibVisTypes.controls.pointSeries.valueAxes.minLabel', {
          defaultMessage: 'Min',
        })}
        step={0.1}
        paramName="min"
        value={min}
        setValue={setValue}
      />
      {errors.length > 0 && errors.map(error => <EuiFormErrorText>{error}</EuiFormErrorText>)}
    </>
  );
}

export { YExtends };
