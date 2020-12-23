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
import React, { useCallback } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPanel, EuiTitle, EuiColorPicker, EuiFormRow, EuiSpacer } from '@elastic/eui';

import {
  SelectOption,
  SwitchOption,
  RequiredNumberInputOption,
} from '../../../../../../vis_default_editor/public';
import { ValidationVisOptionsProps } from '../../common';
import { VisParams } from '../../../../types';

function ThresholdPanel({
  stateParams,
  setValue,
  setMultipleValidity,
  vis,
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
            options={vis.type.editorConfig.collections.thresholdLineStyles}
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
