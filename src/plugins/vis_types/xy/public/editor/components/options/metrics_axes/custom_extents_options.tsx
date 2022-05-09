/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect } from 'react';

import { i18n } from '@kbn/i18n';

import { NumberInputOption, SwitchOption } from '@kbn/vis-default-editor-plugin/public';

import { ValueAxis } from '../../../../types';
import { YExtents } from './y_extents';
import { SetScale } from './value_axis_options';

export interface CustomExtentsOptionsProps {
  axisScale: ValueAxis['scale'];
  setMultipleValidity(paramName: string, isValid: boolean): void;
  setValueAxis<T extends keyof ValueAxis>(paramName: T, value: ValueAxis[T]): void;
  setValueAxisScale: SetScale;
  disableAxisExtents?: boolean;
}

function CustomExtentsOptions({
  axisScale,
  setMultipleValidity,
  setValueAxis,
  setValueAxisScale,
  disableAxisExtents = false,
}: CustomExtentsOptionsProps) {
  const invalidBoundsMarginMessage = i18n.translate(
    'visTypeXy.controls.pointSeries.valueAxes.scaleToDataBounds.minNeededBoundsMargin',
    { defaultMessage: 'Bounds margin must be greater than or equal to 0.' }
  );

  const isBoundsMarginValid =
    !axisScale.defaultYExtents || !axisScale.boundsMargin || axisScale.boundsMargin >= 0;

  const setBoundsMargin = useCallback(
    (paramName: 'boundsMargin', value: number | '') =>
      setValueAxisScale(paramName, value === '' ? undefined : value),
    [setValueAxisScale]
  );

  const onDefaultYExtentsChange = useCallback(
    (paramName: 'defaultYExtents', value: boolean) => {
      const scale = { ...axisScale, [paramName]: value };
      if (!scale.defaultYExtents) {
        delete scale.boundsMargin;
      }
      setValueAxis('scale', scale);
    },
    [axisScale, setValueAxis]
  );

  const onSetYExtentsChange = useCallback(
    (paramName: 'setYExtents', value: boolean) => {
      const scale = { ...axisScale, [paramName]: value };
      if (!scale.setYExtents) {
        delete scale.min;
        delete scale.max;
      }
      setValueAxis('scale', scale);
    },
    [axisScale, setValueAxis]
  );

  useEffect(() => {
    setMultipleValidity('boundsMargin', isBoundsMarginValid);

    return () => setMultipleValidity('boundsMargin', true);
  }, [isBoundsMarginValid, setMultipleValidity]);

  return (
    <>
      <SwitchOption
        label={i18n.translate('visTypeXy.controls.pointSeries.valueAxes.scaleToDataBoundsLabel', {
          defaultMessage: 'Scale to data bounds',
        })}
        paramName="defaultYExtents"
        value={axisScale.defaultYExtents}
        setValue={onDefaultYExtentsChange}
      />

      {axisScale.defaultYExtents && (
        <>
          <NumberInputOption
            error={!isBoundsMarginValid && invalidBoundsMarginMessage}
            isInvalid={!isBoundsMarginValid}
            label={i18n.translate(
              'visTypeXy.controls.pointSeries.valueAxes.scaleToDataBounds.boundsMargin',
              {
                defaultMessage: 'Bounds margin',
              }
            )}
            step={0.1}
            min={0}
            paramName="boundsMargin"
            value={axisScale.boundsMargin}
            setValue={setBoundsMargin}
          />
        </>
      )}

      <SwitchOption
        data-test-subj="yAxisSetYExtents"
        label={i18n.translate('visTypeXy.controls.pointSeries.valueAxes.setAxisExtentsLabel', {
          defaultMessage: 'Set axis extents',
        })}
        paramName="setYExtents"
        value={axisScale.setYExtents}
        setValue={onSetYExtentsChange}
        disabled={disableAxisExtents}
      />

      {axisScale.setYExtents && !disableAxisExtents && (
        <YExtents
          scale={axisScale}
          setScale={setValueAxisScale}
          setMultipleValidity={setMultipleValidity}
        />
      )}
    </>
  );
}

export { CustomExtentsOptions };
