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

import React, { useEffect, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { Scale } from '../../../types';
import { ScaleTypes } from '../../../utils/collections';
import { NumberInputOption } from '../../common';
import { SetScale } from './value_axis_options';

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

function areExtentsValid(min: number | null = null, max: number | null = null): boolean {
  if (min === null || max === null) {
    return true;
  }

  return max > min;
}

function isNullOrUndefined(value?: number | null): value is null | undefined {
  return value === null || value === undefined;
}

export interface YExtentsProps {
  scale: Scale;
  setScale: SetScale;
  setMultipleValidity: (paramName: string, isValid: boolean) => void;
}

function YExtents({ scale, setScale, setMultipleValidity }: YExtentsProps) {
  const { min, max, type } = scale;
  const errors = [];

  if (!areExtentsValid(min, max)) {
    errors.push(rangeError);
  }

  if (type === ScaleTypes.LOG && (isNullOrUndefined(min) || min <= 0)) {
    errors.push(minError);
  }

  const isValid = !errors.length;

  const setExtents = useCallback(
    (paramName, value) => {
      setScale(paramName, value === '' ? null : value);
    },
    [setScale]
  );

  useEffect(() => {
    setMultipleValidity('yExtents', isValid);

    return () => setMultipleValidity('yExtents', true);
  }, [isValid, setMultipleValidity]);

  return (
    <EuiFormRow error={errors} isInvalid={!!errors.length} fullWidth compressed>
      <>
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <NumberInputOption
              data-test-subj="yAxisYExtentsMin"
              isInvalid={!!errors.length}
              label={i18n.translate('kbnVislibVisTypes.controls.pointSeries.valueAxes.minLabel', {
                defaultMessage: 'Min',
              })}
              step={0.1}
              paramName="min"
              value={isNullOrUndefined(min) ? '' : min}
              setValue={setExtents}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <NumberInputOption
              data-test-subj="yAxisYExtentsMax"
              label={i18n.translate('kbnVislibVisTypes.controls.pointSeries.valueAxes.maxLabel', {
                defaultMessage: 'Max',
              })}
              step={0.1}
              paramName="max"
              value={isNullOrUndefined(max) ? '' : max}
              setValue={setExtents}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    </EuiFormRow>
  );
}

export { YExtents };
