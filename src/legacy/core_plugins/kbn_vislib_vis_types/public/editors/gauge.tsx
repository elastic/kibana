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

import { VisOptionsProps } from 'ui/vis/editors/default';
import { RangesParamEditor } from 'ui/agg_types/controls/ranges';
import { SelectOption } from '../controls/select';
import { SwitchOption } from '../controls/switch';
import { TextInputOption } from '../controls/text_input';
import { GaugeVisParams } from '../gauge';

function GaugeOptions({
  stateParams,
  setValue,
  setValidity,
  setTouched,
  vis,
  uiState,
}: VisOptionsProps<GaugeVisParams>) {
  const [isCustomColors, setIsCustomColors] = useState(false);

  useEffect(() => {
    uiState.on('colorChanged', () => {
      setIsCustomColors(true);
    });
  }, []);

  const setGaugeValue = useCallback(
    <T extends keyof GaugeVisParams['gauge']>(paramName: T, value: GaugeVisParams['gauge'][T]) =>
      setValue('gauge', {
        ...stateParams.gauge,
        [paramName]: value,
      }),
    [stateParams.gauge]
  );

  const setGaugeType = useCallback(
    (paramName: 'gaugeType', value: GaugeVisParams['gauge']['gaugeType']) => {
      const minAngle = value === 'Arc' ? undefined : 0;
      const maxAngle = value === 'Arc' ? undefined : 2 * Math.PI;

      setValue('gauge', {
        ...stateParams.gauge,
        [paramName]: value,
        minAngle,
        maxAngle,
      });
    },
    [stateParams.gauge]
  );

  const addRangeValues = useCallback(() => {
    const previousRange = last(stateParams.gauge.colorsRange);
    const from = previousRange.to ? previousRange.to : 0;
    const to = previousRange.to ? from + (previousRange.to - (previousRange.from || 0)) : 100;

    return { from, to };
  }, [stateParams.gauge.colorsRange]);

  const validateRange = useCallback(
    ({ from, to }, index) => {
      const leftBound = index === 0 ? -Infinity : stateParams.gauge.colorsRange[index - 1].to;
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
    <>
      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h2>
            <FormattedMessage
              id="kbnVislibVisTypes.controls.gaugeOptions.styleTitle"
              defaultMessage="Style"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />

        <SelectOption
          label={i18n.translate('kbnVislibVisTypes.controls.gaugeOptions.gaugeTypeLabel', {
            defaultMessage: 'Gauge type',
          })}
          options={vis.type.editorConfig.collections.gaugeTypes}
          paramName="gaugeType"
          value={stateParams.gauge.gaugeType}
          setValue={setGaugeType}
        />

        <SelectOption
          label={i18n.translate('kbnVislibVisTypes.controls.gaugeOptions.alignmentLabel', {
            defaultMessage: 'Alignment',
          })}
          options={vis.type.editorConfig.collections.alignments}
          paramName="alignment"
          value={stateParams.gauge.alignment}
          setValue={setGaugeValue}
        />
      </EuiPanel>

      <EuiSpacer size="s" />

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
          tooltip={i18n.translate('kbnVislibVisTypes.controls.gaugeOptions.extendRangeTipText', {
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

      <EuiSpacer size="s" />

      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h2>
            <FormattedMessage
              id="kbnVislibVisTypes.controls.gaugeOptions.labelsTitle"
              defaultMessage="Labels"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />

        <SwitchOption
          label={i18n.translate('kbnVislibVisTypes.controls.gaugeOptions.showLabelsLabel', {
            defaultMessage: 'Show labels',
          })}
          paramName="show"
          value={stateParams.gauge.labels.show}
          setValue={(paramName, value) =>
            setGaugeValue('labels', { ...stateParams.gauge.labels, [paramName]: value })
          }
        />
        <EuiSpacer size="s" />

        <TextInputOption
          disabled={!stateParams.gauge.labels.show}
          label={i18n.translate('kbnVislibVisTypes.controls.gaugeOptions.subTextLabel', {
            defaultMessage: 'Sub label',
          })}
          paramName="subText"
          value={stateParams.gauge.style.subText}
          setValue={(paramName, value) =>
            setGaugeValue('style', { ...stateParams.gauge.style, [paramName]: value })
          }
        />

        <SwitchOption
          disabled={!stateParams.gauge.labels.show}
          label={i18n.translate('kbnVislibVisTypes.controls.gaugeOptions.displayWarningsLabel', {
            defaultMessage: 'Display warnings',
          })}
          tooltip={i18n.translate('kbnVislibVisTypes.controls.gaugeOptions.switchWarningsTipText', {
            defaultMessage:
              'Turns on/off warnings. When turned on, a warning will be shown if not all labels could be displayed.',
          })}
          paramName="isDisplayWarning"
          value={stateParams.isDisplayWarning}
          setValue={setValue}
        />
      </EuiPanel>
    </>
  );
}

export { GaugeOptions };
