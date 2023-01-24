/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { NumberInputOption } from '@kbn/vis-default-editor-plugin/public';

import { Scale, ScaleType } from '../../../../types';
import { SetScale } from './value_axis_options';

const rangeError = i18n.translate('visTypeXy.controls.pointSeries.valueAxes.minErrorMessage', {
  defaultMessage: 'Min should be less than Max.',
});
const minError = i18n.translate('visTypeXy.controls.pointSeries.valueAxes.minNeededScaleText', {
  defaultMessage: 'Min must exceed 0 when a log scale is selected.',
});

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

  if (type === ScaleType.Log && (isNullOrUndefined(min) || min <= 0)) {
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
    <EuiFormRow error={errors} isInvalid={!!errors.length} fullWidth display="rowCompressed">
      <>
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <NumberInputOption
              data-test-subj="yAxisYExtentsMin"
              isInvalid={!!errors.length}
              label={i18n.translate('visTypeXy.controls.pointSeries.valueAxes.minLabel', {
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
              label={i18n.translate('visTypeXy.controls.pointSeries.valueAxes.maxLabel', {
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
