/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPanel, EuiTitle, EuiColorPicker, EuiFormRow, EuiSpacer } from '@elastic/eui';

import {
  SelectOption,
  SwitchOption,
  RequiredNumberInputOption,
} from '@kbn/vis-default-editor-plugin/public';
import { ValidationVisOptionsProps } from '../../common';
import { VisParams } from '../../../../types';
import { getThresholdLineStyles } from '../../../collections';

const thresholdLineStyles = getThresholdLineStyles();

function ThresholdPanel({
  stateParams,
  setValue,
  setMultipleValidity,
}: ValidationVisOptionsProps<VisParams>) {
  const setThresholdLine = useCallback(
    <T extends keyof VisParams['thresholdLine']>(
      paramName: T,
      value: VisParams['thresholdLine'][T]
    ) => setValue('thresholdLine', { ...stateParams.thresholdLine, [paramName]: value }),
    [stateParams.thresholdLine, setValue]
  );

  const setThresholdLineColor = useCallback(
    (value: VisParams['thresholdLine']['color']) => setThresholdLine('color', value),
    [setThresholdLine]
  );

  const setThresholdLineValidity = useCallback(
    (paramName: keyof VisParams['thresholdLine'], isValid: boolean) =>
      setMultipleValidity(`thresholdLine__${paramName}`, isValid),
    [setMultipleValidity]
  );

  return (
    <EuiPanel paddingSize="s">
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="visTypeXy.editors.pointSeries.thresholdLineSettingsTitle"
            defaultMessage="Threshold line"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />

      <SwitchOption
        label={i18n.translate('visTypeXy.editors.pointSeries.thresholdLine.showLabel', {
          defaultMessage: 'Show threshold line',
        })}
        paramName="show"
        value={stateParams.thresholdLine.show}
        setValue={setThresholdLine}
      />

      {stateParams.thresholdLine.show && (
        <>
          <RequiredNumberInputOption
            label={i18n.translate('visTypeXy.editors.pointSeries.thresholdLine.valueLabel', {
              defaultMessage: 'Threshold value',
            })}
            paramName="value"
            value={stateParams.thresholdLine.value}
            setValue={setThresholdLine}
            setValidity={setThresholdLineValidity}
            data-test-subj="thresholdValueInputOption"
          />

          <RequiredNumberInputOption
            label={i18n.translate('visTypeXy.editors.pointSeries.thresholdLine.widthLabel', {
              defaultMessage: 'Line width',
            })}
            paramName="width"
            min={1}
            step={1}
            value={stateParams.thresholdLine.width}
            setValue={setThresholdLine}
            setValidity={setThresholdLineValidity}
          />

          <SelectOption
            label={i18n.translate('visTypeXy.editors.pointSeries.thresholdLine.styleLabel', {
              defaultMessage: 'Line style',
            })}
            options={thresholdLineStyles}
            paramName="style"
            value={stateParams.thresholdLine.style}
            setValue={setThresholdLine}
          />

          <EuiFormRow
            label={i18n.translate('visTypeXy.editors.pointSeries.thresholdLine.colorLabel', {
              defaultMessage: 'Line color',
            })}
            fullWidth
            display="rowCompressed"
          >
            <EuiColorPicker
              compressed
              color={stateParams.thresholdLine.color}
              fullWidth
              onChange={setThresholdLineColor}
            />
          </EuiFormRow>
        </>
      )}
    </EuiPanel>
  );
}

export { ThresholdPanel };
