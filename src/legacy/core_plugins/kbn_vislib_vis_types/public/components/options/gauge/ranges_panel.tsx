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

import React, { useCallback, useEffect, useState } from 'react';
import { last } from 'lodash';
import { EuiLink, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { RangesParamEditor } from 'ui/vis/editors/default/controls/ranges';
import { SelectOption, SwitchOption } from '../../common';
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
  const [isCustomColors, setIsCustomColors] = useState(false);

  useEffect(() => {
    uiState.on('colorChanged', () => {
      setIsCustomColors(true);
    });
  }, [uiState]);

  const addRangeValues = useCallback(() => {
    const previousRange = last(stateParams.gauge.colorsRange);
    const from = previousRange.to ? previousRange.to : 0;
    const to = previousRange.to ? from + (previousRange.to - (previousRange.from || 0)) : 100;

    return { from, to };
  }, [stateParams.gauge.colorsRange]);

  const validateRange = useCallback(
    ({ from, to }, index) => {
      const leftBound = index === 0 ? -Infinity : stateParams.gauge.colorsRange[index - 1].to || 0;
      const isFromValid = from >= leftBound;
      const isToValid = to >= from;

      return [isFromValid, isToValid];
    },
    [stateParams.gauge.colorsRange]
  );

  const resetColorsButton = (
    <EuiText size="xs">
      <EuiLink
        onClick={() => {
          uiState.set('vis.colors', null);
          setIsCustomColors(false);
        }}
      >
        <FormattedMessage
          id="kbnVislibVisTypes.controls.gaugeOptions.resetColorsButtonLabel"
          defaultMessage="Reset colors"
        />
      </EuiLink>
    </EuiText>
  );

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

      <RangesParamEditor
        dataTestSubj="gaugeColorRange"
        error={i18n.translate('kbnVislibVisTypes.controls.gaugeOptions.errorText', {
          defaultMessage: 'Each range should be greater than previous.',
        })}
        hidePlaceholders={true}
        value={stateParams.gauge.colorsRange}
        setValue={value => setGaugeValue('colorsRange', value)}
        setTouched={setTouched}
        setValidity={setValidity}
        addRangeValues={addRangeValues}
        validateRange={validateRange}
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
      <EuiSpacer size="s" />

      <SelectOption
        disabled={stateParams.gauge.colorsRange.length < 2}
        helpText={i18n.translate(
          'kbnVislibVisTypes.controls.gaugeOptions.howToChangeColorsDescription',
          {
            defaultMessage: 'Note: colors can be changed in the legend.',
          }
        )}
        label={i18n.translate('kbnVislibVisTypes.controls.gaugeOptions.colorSchemaLabel', {
          defaultMessage: 'Color schema',
        })}
        labelAppend={isCustomColors && resetColorsButton}
        options={vis.type.editorConfig.collections.colorSchemas}
        paramName="colorSchema"
        value={stateParams.gauge.colorSchema}
        setValue={setGaugeValue}
      />

      <SwitchOption
        disabled={stateParams.gauge.colorsRange.length < 2}
        label={i18n.translate('kbnVislibVisTypes.controls.gaugeOptions.reverseColorSchemaLabel', {
          defaultMessage: 'Reverse schema',
        })}
        paramName="invertColors"
        value={stateParams.gauge.invertColors}
        setValue={setGaugeValue}
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
