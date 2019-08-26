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

import React, { useState, useCallback } from 'react';
import { EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { ValueAxis } from '../../../types';
import { SwitchOption } from '../../switch';
import { NumberInputOption } from '../../number_input';
import { YExtents } from './y_extents';
import { SetScale } from './value_axis_options';

interface CustomExtentsOptionsProps {
  axis: ValueAxis;
  setMultipleValidity(paramName: string, isValid: boolean): void;
  setValueAxis<T extends keyof ValueAxis>(paramName: T, value: ValueAxis[T]): void;
  setValueAxisScale: SetScale;
}

function CustomExtentsOptions({
  axis,
  setMultipleValidity,
  setValueAxis,
  setValueAxisScale,
}: CustomExtentsOptionsProps) {
  const [isBoundsMarginValid, setIsBoundsMarginValid] = useState(true);
  const invalidBoundsMarginMessage = i18n.translate(
    'kbnVislibVisTypes.controls.pointSeries.valueAxes.scaleToDataBounds.minNeededBoundsMargin',
    { defaultMessage: 'Bounds margin must be greater than or equal to 0.' }
  );

  const setBoundsMargin = useCallback(
    (paramName: 'boundsMargin', value: number | '') => {
      const isValid = value === '' ? true : value >= 0;
      setIsBoundsMarginValid(isValid);
      setMultipleValidity('boundsMargin', isValid);

      setValueAxisScale(paramName, value);
    },
    [setIsBoundsMarginValid, setMultipleValidity, setValueAxisScale]
  );

  const onDefaultYExtentsChange = useCallback(
    (paramName: 'defaultYExtents', value: boolean) => {
      const scale = { ...axis.scale, [paramName]: value };
      if (!scale.defaultYExtents) {
        delete scale.boundsMargin;
        setMultipleValidity('boundsMargin', true);
      }
      setValueAxis('scale', scale);
    },
    [setValueAxis, axis.scale]
  );

  const onSetYExtentsChange = useCallback(
    (paramName: 'setYExtents', value: boolean) => {
      const scale = { ...axis.scale, [paramName]: value };
      if (!scale.setYExtents) {
        delete scale.min;
        delete scale.max;
      }
      setValueAxis('scale', scale);
    },
    [setValueAxis, axis.scale]
  );

  return (
    <>
      <EuiTitle size="xxs">
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
            error={!isBoundsMarginValid ? [invalidBoundsMarginMessage] : undefined}
            isInvalid={!isBoundsMarginValid}
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
        <YExtents
          scale={axis.scale}
          setScale={setValueAxisScale}
          setMultipleValidity={setMultipleValidity}
        />
      )}
    </>
  );
}

export { CustomExtentsOptions };
