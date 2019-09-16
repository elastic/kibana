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

import React, { useCallback, useEffect } from 'react';
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { VisOptionsProps } from 'ui/vis/editors/default';
import {
  BasicOptions,
  ColorRanges,
  ColorSchemaOptions,
  NumberInputOption,
  SelectOption,
  SwitchOption,
  TextInputOption,
} from '../../common';
import { HeatmapVisParams } from '../../../heatmap';
import { ValueAxis } from '../../../types';

const VERTICAL_ROTATION = 270;

function HeatmapOptions(props: VisOptionsProps<HeatmapVisParams>) {
  const { stateParams, vis, uiState, setValue, setValidity, setTouched } = props;
  const [valueAxis] = stateParams.valueAxes;
  const rotateLabels = valueAxis.labels.rotate === VERTICAL_ROTATION;
  const isColorsNumberInvalid = stateParams.colorsNumber < 2 || stateParams.colorsNumber > 10;

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

  const setValueAxisLabels = useCallback(
    <T extends keyof ValueAxis['labels']>(paramName: T, value: ValueAxis['labels'][T]) =>
      setValue('valueAxes', [
        {
          ...valueAxis,
          labels: {
            ...valueAxis.labels,
            [paramName]: value,
          },
        },
      ]),
    [valueAxis, setValue]
  );

  const setParamToched = useCallback(() => setTouched(true), [setTouched]);

  const setRotateLabels = useCallback(
    (paramName: 'rotate', value: boolean) =>
      setValueAxisLabels(paramName, value ? VERTICAL_ROTATION : 0),
    [setValueAxisLabels]
  );

  useEffect(() => {
    setValidity(!isColorsNumberInvalid);
  }, [isColorsNumberInvalid, setValidity]);

  return (
    <>
      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h2>
            <FormattedMessage
              id="kbnVislibVisTypes.editors.heatmap.basicSettingsTitle"
              defaultMessage="Basic settings"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />

        <BasicOptions {...props} />

        <SwitchOption
          label={i18n.translate('kbnVislibVisTypes.editors.heatmap.highlightLabel', {
            defaultMessage: 'Highlight',
          })}
          paramName="enableHover"
          value={stateParams.enableHover}
          setValue={setValue}
        />
      </EuiPanel>

      <EuiSpacer size="s" />

      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h2>
            <FormattedMessage
              id="kbnVislibVisTypes.editors.heatmap.heatmapSettingsTitle"
              defaultMessage="Heatmap settings"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />

        <ColorSchemaOptions
          colorSchema={stateParams.colorSchema}
          colorSchemas={vis.type.editorConfig.collections.colorSchemas}
          invertColors={stateParams.invertColors}
          uiState={uiState}
          setValue={setValue}
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

        {!stateParams.setColorRange && (
          <>
            <SwitchOption
              label={i18n.translate(
                'kbnVislibVisTypes.controls.heatmapOptions.percentageModeLabel',
                { defaultMessage: 'Percentage mode' }
              )}
              paramName="percentageMode"
              value={stateParams.percentageMode}
              setValue={setValue}
            />
            <EuiSpacer size="s" />

            <NumberInputOption
              data-test-subj="heatmapColorsNumber"
              isInvalid={isColorsNumberInvalid}
              label={i18n.translate('kbnVislibVisTypes.controls.heatmapOptions.colorsNumberLabel', {
                defaultMessage: 'Number of colors',
              })}
              max={10}
              min={2}
              paramName="colorsNumber"
              value={stateParams.colorsNumber}
              setValue={setValue}
              setTouched={setParamToched}
            />
          </>
        )}

        <SwitchOption
          dataTestSubj="heatmapUseCustomRanges"
          label={i18n.translate('kbnVislibVisTypes.controls.heatmapOptions.useCustomRangesLabel', {
            defaultMessage: 'Use custom ranges',
          })}
          paramName="setColorRange"
          value={stateParams.setColorRange}
          setValue={setValue}
        />

        {stateParams.setColorRange && (
          <>
            <EuiSpacer size="s" />
            <ColorRanges
              dataTestSubj="heatmapColorRange"
              colorsRange={stateParams.colorsRange}
              setValue={setValue}
              setTouched={setTouched}
              setValidity={setValidity}
            />
          </>
        )}

        <SwitchOption
          label={i18n.translate('kbnVislibVisTypes.controls.heatmapOptions.showLabelsTitle', {
            defaultMessage: 'Show labels',
          })}
          paramName="show"
          value={valueAxis.labels.show}
          setValue={setValueAxisLabels}
        />

        <SwitchOption
          disabled={!valueAxis.labels.show}
          label={i18n.translate('kbnVislibVisTypes.controls.heatmapOptions.rotateLabel', {
            defaultMessage: 'Rotate',
          })}
          paramName="rotate"
          value={rotateLabels}
          setValue={setRotateLabels}
        />

        <SwitchOption
          disabled={!valueAxis.labels.show}
          label={i18n.translate(
            'kbnVislibVisTypes.controls.heatmapOptions.overwriteAutomaticColorLabel',
            {
              defaultMessage: 'Overwrite automatic color',
            }
          )}
          paramName="overwriteColor"
          value={valueAxis.labels.overwriteColor}
          setValue={setValueAxisLabels}
        />

        <TextInputOption
          disabled={!valueAxis.labels.show || !valueAxis.labels.overwriteColor}
          label={i18n.translate('kbnVislibVisTypes.controls.heatmapOptions.colorLabel', {
            defaultMessage: 'Color',
          })}
          paramName="color"
          value={valueAxis.labels.color}
          setValue={setValueAxisLabels}
        />
      </EuiPanel>
    </>
  );
}

export { HeatmapOptions };
