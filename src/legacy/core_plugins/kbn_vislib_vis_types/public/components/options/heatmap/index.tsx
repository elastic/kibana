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

import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { VisOptionsProps } from '../../../legacy_imports';
import {
  BasicOptions,
  ColorRanges,
  ColorSchemaOptions,
  NumberInputOption,
  SelectOption,
  SwitchOption,
} from '../../common';
import { SetColorSchemaOptionsValue } from '../../common/color_schema';
import { HeatmapVisParams } from '../../../heatmap';
import { ValueAxis } from '../../../types';
import { LabelsPanel } from './labels_panel';

function HeatmapOptions(props: VisOptionsProps<HeatmapVisParams>) {
  const { stateParams, vis, uiState, setValue, setValidity, setTouched } = props;
  const [valueAxis] = stateParams.valueAxes;
  const isColorsNumberInvalid = stateParams.colorsNumber < 2 || stateParams.colorsNumber > 10;
  const [isColorRangesValid, setIsColorRangesValid] = useState(false);

  const setValueAxisScale = useCallback(
    <T extends keyof ValueAxis['scale']>(paramName: T, value: ValueAxis['scale'][T]) =>
      setValue('valueAxes', [
        {
          ...valueAxis,
          scale: {
            ...valueAxis.scale,
            [paramName]: value,
          },
        },
      ]),
    [valueAxis, setValue]
  );

  useEffect(() => {
    setValidity(stateParams.setColorRange ? isColorRangesValid : !isColorsNumberInvalid);
  }, [stateParams.setColorRange, isColorRangesValid, isColorsNumberInvalid, setValidity]);

  return (
    <>
      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="kbnVislibVisTypes.editors.heatmap.basicSettingsTitle"
              defaultMessage="Basic settings"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        <BasicOptions {...props} />

        <SwitchOption
          label={i18n.translate('kbnVislibVisTypes.editors.heatmap.highlightLabel', {
            defaultMessage: 'Highlight range',
          })}
          paramName="enableHover"
          value={stateParams.enableHover}
          setValue={setValue}
          tooltip={i18n.translate('kbnVislibVisTypes.editors.heatmap.highlightLabelTooltip', {
            defaultMessage:
              'Highlight hovered range in the chart and corresponding label in the legend.',
          })}
        />
      </EuiPanel>

      <EuiSpacer size="s" />

      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="kbnVislibVisTypes.editors.heatmap.heatmapSettingsTitle"
              defaultMessage="Heatmap settings"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        <ColorSchemaOptions
          colorSchema={stateParams.colorSchema}
          colorSchemas={vis.type.editorConfig.collections.colorSchemas}
          invertColors={stateParams.invertColors}
          uiState={uiState}
          setValue={setValue as SetColorSchemaOptionsValue}
        />
        <EuiSpacer size="s" />

        <SelectOption
          label={i18n.translate('kbnVislibVisTypes.controls.heatmapOptions.colorScaleLabel', {
            defaultMessage: 'Color scale',
          })}
          options={vis.type.editorConfig.collections.scales}
          paramName="type"
          value={valueAxis.scale.type}
          setValue={setValueAxisScale}
        />

        <SwitchOption
          label={i18n.translate(
            'kbnVislibVisTypes.controls.heatmapOptions.scaleToDataBoundsLabel',
            { defaultMessage: 'Scale to data bounds' }
          )}
          paramName="defaultYExtents"
          value={valueAxis.scale.defaultYExtents}
          setValue={setValueAxisScale}
        />

        <SwitchOption
          disabled={stateParams.setColorRange}
          label={i18n.translate('kbnVislibVisTypes.controls.heatmapOptions.percentageModeLabel', {
            defaultMessage: 'Percentage mode',
          })}
          paramName="percentageMode"
          value={stateParams.setColorRange ? false : stateParams.percentageMode}
          setValue={setValue}
        />
        <EuiSpacer size="s" />

        <NumberInputOption
          data-test-subj="heatmapColorsNumber"
          disabled={stateParams.setColorRange}
          isInvalid={isColorsNumberInvalid}
          label={i18n.translate('kbnVislibVisTypes.controls.heatmapOptions.colorsNumberLabel', {
            defaultMessage: 'Number of colors',
          })}
          max={10}
          min={2}
          paramName="colorsNumber"
          value={stateParams.colorsNumber}
          setValue={setValue}
        />

        <SwitchOption
          data-test-subj="heatmapUseCustomRanges"
          label={i18n.translate('kbnVislibVisTypes.controls.heatmapOptions.useCustomRangesLabel', {
            defaultMessage: 'Use custom ranges',
          })}
          paramName="setColorRange"
          value={stateParams.setColorRange}
          setValue={setValue}
        />

        {stateParams.setColorRange && (
          <ColorRanges
            data-test-subj="heatmapColorRange"
            colorsRange={stateParams.colorsRange}
            setValue={setValue}
            setTouched={setTouched}
            setValidity={setIsColorRangesValid}
          />
        )}
      </EuiPanel>

      <EuiSpacer size="s" />

      <LabelsPanel valueAxis={valueAxis} setValue={setValue} />
    </>
  );
}

export { HeatmapOptions };
