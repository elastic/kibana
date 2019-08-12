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
import { EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { VisOptionsProps } from 'ui/vis/editors/default';
import { RangesParamEditor } from 'ui/agg_types/controls/ranges';
import { SelectOption } from '../controls/select';
import { SwitchOption } from '../controls/switch';
import { TextInputOption } from '../controls/text_input';
import { GaugeVisParams } from '../gauge';

function GaugeOptions(props: VisOptionsProps<GaugeVisParams>) {
  const { stateParams, setValue, vis } = props;

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

  return (
    <EuiPanel paddingSize="s">
      <SelectOption
        label={i18n.translate('kbnVislibVisTypes.controls.gaugeOptions.gaugeTypeLabel', {
          defaultMessage: 'Gauge type',
        })}
        options={vis.type.editorConfig.collections.gaugeTypes}
        paramName="gaugeType"
        value={stateParams.gauge.gaugeType}
        setValue={setGaugeType}
      />

      <SwitchOption
        label={i18n.translate('kbnVislibVisTypes.controls.gaugeOptions.percentageModeLabel', {
          defaultMessage: 'Percentage mode',
        })}
        paramName="percentageMode"
        value={stateParams.gauge.percentageMode}
        setValue={setGaugeValue}
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

      <SwitchOption
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

      <SwitchOption
        label={i18n.translate('kbnVislibVisTypes.controls.gaugeOptions.showLegendLabel', {
          defaultMessage: 'Show legend',
        })}
        paramName="addLegend"
        value={stateParams.addLegend}
        setValue={setValue}
      />

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

      {stateParams.gauge.labels.show && (
        <TextInputOption
          label={i18n.translate('kbnVislibVisTypes.controls.gaugeOptions.subTextLabel', {
            defaultMessage: 'Sub text',
          })}
          paramName="subText"
          value={stateParams.gauge.style.subText}
          setValue={(paramName, value) =>
            setGaugeValue('style', { ...stateParams.gauge.style, [paramName]: value })
          }
        />
      )}

      {stateParams.gauge.colorsRange.length > 1 && (
        <SwitchOption
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
      )}

      <RangesParamEditor
        value={stateParams.gauge.colorsRange}
        setValue={value => setGaugeValue('colorsRange', value)}
      />
    </EuiPanel>
  );
}

export { GaugeOptions };
