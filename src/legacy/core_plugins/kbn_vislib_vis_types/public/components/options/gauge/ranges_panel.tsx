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

import React from 'react';
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { ColorRanges, ColorSchemaOptions, SwitchOption } from '../../common';
import { SetColorSchemaOptionsValue } from '../../common/color_schema';
import { GaugeOptionsInternalProps } from '.';

function RangesPanel({
  setGaugeValue,
  setTouched,
  setValidity,
  setValue,
  stateParams,
  uiState,
  vis,
}: GaugeOptionsInternalProps) {
  return (
    <EuiPanel paddingSize="s">
      <EuiTitle size="xs">
        <h2>
          <FormattedMessage
            id="kbnVislibVisTypes.controls.gaugeOptions.rangesTitle"
            defaultMessage="Ranges"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />

      <ColorRanges
        data-test-subj="gaugeColorRange"
        colorsRange={stateParams.gauge.colorsRange}
        setValue={setGaugeValue}
        setTouched={setTouched}
        setValidity={setValidity}
      />

      <SwitchOption
        disabled={stateParams.gauge.colorsRange.length < 2}
        label={i18n.translate('kbnVislibVisTypes.controls.gaugeOptions.autoExtendRangeLabel', {
          defaultMessage: 'Auto extend range',
        })}
        tooltip={i18n.translate('kbnVislibVisTypes.controls.gaugeOptions.extendRangeTooltip', {
          defaultMessage: 'Extends range to the maximum value in your data.',
        })}
        paramName="extendRange"
        value={stateParams.gauge.extendRange}
        setValue={setGaugeValue}
      />

      <SwitchOption
        dataTestSubj="gaugePercentageMode"
        label={i18n.translate('kbnVislibVisTypes.controls.gaugeOptions.percentageModeLabel', {
          defaultMessage: 'Percentage mode',
        })}
        paramName="percentageMode"
        value={stateParams.gauge.percentageMode}
        setValue={setGaugeValue}
      />

      <ColorSchemaOptions
        disabled={stateParams.gauge.colorsRange.length < 2}
        colorSchema={stateParams.gauge.colorSchema}
        colorSchemas={vis.type.editorConfig.collections.colorSchemas}
        invertColors={stateParams.gauge.invertColors}
        uiState={uiState}
        setValue={setGaugeValue as SetColorSchemaOptionsValue}
      />

      <SwitchOption
        label={i18n.translate('kbnVislibVisTypes.controls.gaugeOptions.showLegendLabel', {
          defaultMessage: 'Show legend',
        })}
        paramName="addLegend"
        value={stateParams.addLegend}
        setValue={setValue}
      />

      <SwitchOption
        label={i18n.translate('kbnVislibVisTypes.controls.gaugeOptions.showScaleLabel', {
          defaultMessage: 'Show scale',
        })}
        paramName="show"
        value={stateParams.gauge.scale.show}
        setValue={(paramName, value) =>
          setGaugeValue('scale', { ...stateParams.gauge.scale, [paramName]: value })
        }
      />
    </EuiPanel>
  );
}

export { RangesPanel };
