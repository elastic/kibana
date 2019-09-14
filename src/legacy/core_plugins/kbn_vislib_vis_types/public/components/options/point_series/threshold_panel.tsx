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
import { EuiPanel, EuiTitle, EuiColorPicker, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { VisOptionsProps } from 'ui/vis/editors/default';
import { NumberInputOption, SelectOption, SwitchOption } from '../../common';
import { BasicVislibParams } from '../../../types';

function ThresholdPanel({ stateParams, setValue, vis }: VisOptionsProps<BasicVislibParams>) {
  const setThresholdLine = useCallback(
    <T extends keyof BasicVislibParams['thresholdLine']>(
      paramName: T,
      value: BasicVislibParams['thresholdLine'][T]
    ) => setValue('thresholdLine', { ...stateParams.thresholdLine, [paramName]: value }),
    [stateParams.thresholdLine, setValue]
  );

  const setThresholdLineColor = useCallback(
    (value: BasicVislibParams['thresholdLine']['color']) => setThresholdLine('color', value),
    [setThresholdLine]
  );

  return (
    <EuiPanel paddingSize="s">
      <EuiTitle size="xs">
        <h2>
          <FormattedMessage
            id="kbnVislibVisTypes.editors.pointSeries.thresholdLineSettingsTitle"
            defaultMessage="Threshold line"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />

      <SwitchOption
        label={i18n.translate('kbnVislibVisTypes.editors.pointSeries.thresholdLine.showLabel', {
          defaultMessage: 'Show threshold line',
        })}
        paramName="show"
        value={stateParams.thresholdLine.show}
        setValue={setThresholdLine}
      />

      {stateParams.thresholdLine.show && (
        <>
          <NumberInputOption
            label={i18n.translate(
              'kbnVislibVisTypes.editors.pointSeries.thresholdLine.valueLabel',
              {
                defaultMessage: 'Threshold value',
              }
            )}
            paramName="value"
            value={stateParams.thresholdLine.value}
            setValue={setThresholdLine}
          />

          <NumberInputOption
            label={i18n.translate(
              'kbnVislibVisTypes.editors.pointSeries.thresholdLine.widthLabel',
              {
                defaultMessage: 'Line width',
              }
            )}
            paramName="width"
            min={1}
            step={1}
            value={stateParams.thresholdLine.width}
            setValue={setThresholdLine}
          />

          <SelectOption
            label={i18n.translate(
              'kbnVislibVisTypes.editors.pointSeries.thresholdLine.styleLabel',
              {
                defaultMessage: 'Line style',
              }
            )}
            options={vis.type.editorConfig.collections.thresholdLineStyles}
            paramName="style"
            value={stateParams.thresholdLine.style}
            setValue={setThresholdLine}
          />

          <EuiFormRow
            label={i18n.translate(
              'kbnVislibVisTypes.editors.pointSeries.thresholdLine.colorLabel',
              {
                defaultMessage: 'Line color',
              }
            )}
            fullWidth
            compressed
          >
            <EuiColorPicker
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
