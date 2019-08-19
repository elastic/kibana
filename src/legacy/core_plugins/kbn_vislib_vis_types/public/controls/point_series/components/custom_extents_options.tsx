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

import React, { useState } from 'react';
import { EuiTitle, EuiFormErrorText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { ValueAxis } from '../../../types';
import { SwitchOption } from '../../switch';
import { NumberInputOption } from '../../number_input';
import { ValueAxisOptionsParams } from './value_axis_options';
import { YExtends } from './y_extends';

interface CustomExtentsOptionsProps extends ValueAxisOptionsParams {
  setValueAxisScale: <T extends keyof ValueAxis['scale']>(
    paramName: T,
    value: ValueAxis['scale'][T]
  ) => void;
  setValueAxis: <T extends keyof ValueAxis>(paramName: T, value: ValueAxis[T]) => void;
}

function CustomExtentsOptions({
  setValueAxisScale,
  setValueAxis,
  axis,
}: CustomExtentsOptionsProps) {
  const [isBoundsMarginValid, setIsBoundsMarginValid] = useState(true);
  const setValidity = (isValid: boolean) => {};

  const setBoundsMargin = (paramName: 'boundsMargin', value: number | '') => {
    const isValid = value === '' ? true : value >= 0;
    setIsBoundsMarginValid(isValid);
    setValidity(isValid);

    setValueAxisScale(paramName, value);
  };

  const onDefaultYExtentsChange = (paramName: 'defaultYExtents', value: boolean) => {
    const scale = { ...axis.scale, [paramName]: value };
    if (!scale.defaultYExtents) {
      delete scale.boundsMargin;
    }
    setValueAxis('scale', scale);
  };

  const onSetYExtentsChange = (paramName: 'setYExtents', value: boolean) => {
    const scale = { ...axis.scale, [paramName]: value };
    if (!scale.setYExtents) {
      delete scale.min;
      delete scale.max;
    }
    setValueAxis('scale', scale);
  };

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="kbnVislibVisTypes.controls.pointSeries.valueAxes.customExtentsTitle"
            defaultMessage="Custom extents"
          />
        </h3>
      </EuiTitle>

      <SwitchOption
        label={i18n.translate(
          'kbnVislibVisTypes.controls.pointSeries.valueAxes.scaleToDataBoundsLabel',
          {
            defaultMessage: 'Scale to data bounds',
          }
        )}
        paramName="defaultYExtents"
        value={axis.scale.defaultYExtents}
        setValue={onDefaultYExtentsChange}
      />

      {axis.scale.defaultYExtents && (
        <>
          <NumberInputOption
            label={i18n.translate(
              'kbnVislibVisTypes.controls.pointSeries.valueAxes.scaleToDataBounds.boundsMargin',
              {
                defaultMessage: 'Bounds margin',
              }
            )}
            step={0.1}
            min={0}
            paramName="boundsMargin"
            value={axis.scale.boundsMargin}
            setValue={setBoundsMargin}
          />
          {!isBoundsMarginValid && (
            <EuiFormErrorText>
              <FormattedMessage
                id="kbnVislibVisTypes.controls.pointSeries.valueAxes.scaleToDataBounds.minNeededBoundsMargin"
                defaultMessage="Bounds margin must be greater than or equal to 0"
              />
            </EuiFormErrorText>
          )}
        </>
      )}

      <SwitchOption
        label={i18n.translate(
          'kbnVislibVisTypes.controls.pointSeries.valueAxes.setAxisExtentsLabel',
          {
            defaultMessage: 'Set axis extents',
          }
        )}
        paramName="setYExtents"
        value={axis.scale.setYExtents}
        setValue={onSetYExtentsChange}
      />

      {axis.scale.setYExtents && (
        <YExtends scale={axis.scale} setValue={setValueAxisScale} setValidity={setValidity} />
      )}
    </>
  );
}

export { CustomExtentsOptions };
