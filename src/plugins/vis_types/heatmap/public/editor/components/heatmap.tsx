/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiPanel, EuiTitle, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  BasicOptions,
  SelectOption,
  SwitchOption,
  ColorRanges,
  SetColorRangeValue,
  SetColorSchemaOptionsValue,
  ColorSchemaOptions,
  NumberInputOption,
  PercentageModeOption,
} from '../../../../../vis_default_editor/public';
import { colorSchemas } from '../../../../../charts/public';
import { VisEditorOptionsProps } from '../../../../../visualizations/public';
import { HeatmapVisParams, HeatmapTypeProps, ValueAxis } from '../../types';
import { LabelsPanel } from './labels_panel';
import { legendPositions, scaleTypes } from '../collections';

export interface HeatmapOptionsProps
  extends VisEditorOptionsProps<HeatmapVisParams>,
    HeatmapTypeProps {}

const HeatmapOptions = (props: HeatmapOptionsProps) => {
  const { stateParams, uiState, setValue, setValidity, setTouched, showElasticChartsOptions } =
    props;
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

  useEffect(() => {
    if (stateParams.setColorRange) {
      stateParams.percentageMode = false;
    }
  }, [stateParams]);

  return (
    <>
      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="visTypeVislib.editors.heatmap.basicSettingsTitle"
              defaultMessage="Basic settings"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        <BasicOptions {...props} legendPositions={legendPositions} />

        <SwitchOption
          label={i18n.translate('visTypeVislib.editors.heatmap.highlightLabel', {
            defaultMessage: 'Highlight range',
          })}
          paramName="enableHover"
          value={stateParams.enableHover}
          setValue={setValue}
          tooltip={i18n.translate('visTypeVislib.editors.heatmap.highlightLabelTooltip', {
            defaultMessage:
              'Highlight hovered range in the chart and corresponding label in the legend.',
          })}
          disabled={showElasticChartsOptions}
        />
      </EuiPanel>

      <EuiSpacer size="s" />

      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="visTypeVislib.editors.heatmap.heatmapSettingsTitle"
              defaultMessage="Heatmap settings"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        <ColorSchemaOptions
          colorSchema={stateParams.colorSchema}
          colorSchemas={colorSchemas}
          invertColors={stateParams.invertColors}
          uiState={uiState}
          setValue={setValue as SetColorSchemaOptionsValue}
        />
        <EuiSpacer size="s" />

        <SelectOption
          label={i18n.translate('visTypeVislib.controls.heatmapOptions.colorScaleLabel', {
            defaultMessage: 'Color scale',
          })}
          options={scaleTypes}
          paramName="type"
          value={valueAxis.scale.type}
          setValue={setValueAxisScale}
        />

        {!showElasticChartsOptions && (
          <SwitchOption
            label={i18n.translate('visTypeVislib.controls.heatmapOptions.scaleToDataBoundsLabel', {
              defaultMessage: 'Scale to data bounds',
            })}
            paramName="defaultYExtents"
            value={valueAxis.scale.defaultYExtents}
            setValue={setValueAxisScale}
          />
        )}

        <PercentageModeOption
          data-test-subj="metricPercentageMode"
          percentageMode={stateParams.setColorRange ? false : stateParams.percentageMode}
          disabled={stateParams.setColorRange}
          formatPattern={stateParams.percentageFormatPattern}
          setValue={setValue}
        />
        <EuiSpacer size="s" />

        <NumberInputOption
          data-test-subj="heatmapColorsNumber"
          disabled={stateParams.setColorRange}
          isInvalid={isColorsNumberInvalid}
          label={i18n.translate('visTypeVislib.controls.heatmapOptions.colorsNumberLabel', {
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
          label={i18n.translate('visTypeVislib.controls.heatmapOptions.useCustomRangesLabel', {
            defaultMessage: 'Use custom ranges',
          })}
          paramName="setColorRange"
          value={stateParams.setColorRange}
          setValue={setValue}
        />

        {stateParams.setColorRange && stateParams.colorsRange && (
          <ColorRanges
            data-test-subj="heatmapColorRange"
            colorsRange={stateParams.colorsRange}
            setValue={setValue as SetColorRangeValue}
            setTouched={setTouched}
            setValidity={setIsColorRangesValid}
          />
        )}
      </EuiPanel>

      <EuiSpacer size="s" />

      <LabelsPanel
        valueAxis={valueAxis}
        setValue={setValue}
        isNewLibrary={showElasticChartsOptions}
        isCellLabelVisible={stateParams.isCellLabelVisible}
      />
    </>
  );
};

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { HeatmapOptions as default };
