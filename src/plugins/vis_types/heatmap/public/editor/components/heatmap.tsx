/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiPanel, EuiTitle, EuiSpacer, EuiToolTip } from '@elastic/eui';
import { Position } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

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
  LongLegendOptions,
  LegendSizeSettings,
} from '@kbn/vis-default-editor-plugin/public';
import { colorSchemas } from '@kbn/charts-plugin/public';
import { VisEditorOptionsProps } from '@kbn/visualizations-plugin/public';
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

  const handleLegendSizeChange = useCallback((size) => setValue('legendSize', size), [setValue]);

  return (
    <>
      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="visTypeHeatmap.editors.heatmap.basicSettingsTitle"
              defaultMessage="Basic settings"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        <BasicOptions {...props} legendPositions={legendPositions} />
        {showElasticChartsOptions && (
          <>
            <LongLegendOptions
              data-test-subj="heatmapLongLegendsOptions"
              truncateLegend={stateParams.truncateLegend ?? true}
              maxLegendLines={stateParams.maxLegendLines ?? 1}
              setValue={setValue}
            />
            <LegendSizeSettings
              legendSize={stateParams.legendSize}
              onLegendSizeChange={handleLegendSizeChange}
              isVerticalLegend={
                stateParams.legendPosition === Position.Left ||
                stateParams.legendPosition === Position.Right
              }
            />
          </>
        )}

        <SwitchOption
          label={i18n.translate('visTypeHeatmap.editors.heatmap.highlightLabel', {
            defaultMessage: 'Highlight range',
          })}
          data-test-subj="heatmapHighlightRange"
          paramName="enableHover"
          value={stateParams.enableHover}
          setValue={setValue}
          tooltip={
            showElasticChartsOptions
              ? i18n.translate('visTypeHeatmap.editors.heatmap.highlightLabelTooltipNotAvailable', {
                  defaultMessage:
                    'Highlight hovered range is not yet supported with the new charts library. Please enable the heatmap legacy charts library advanced setting .',
                })
              : i18n.translate('visTypeHeatmap.editors.heatmap.highlightLabelTooltip', {
                  defaultMessage:
                    'Highlight hovered range in the chart and corresponding label in the legend.',
                })
          }
          disabled={showElasticChartsOptions}
        />
      </EuiPanel>

      <EuiSpacer size="s" />

      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="visTypeHeatmap.editors.heatmap.heatmapSettingsTitle"
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
        <EuiToolTip
          content={
            showElasticChartsOptions
              ? i18n.translate('visTypeHeatmap.editors.heatmap.colorScaleTooltipNotAvailable', {
                  defaultMessage:
                    'Color scale is not supported with the new charts library. Please enable the heatmap legacy charts library advanced setting.',
                })
              : null
          }
          delay="long"
          position="right"
        >
          <SelectOption
            label={i18n.translate('visTypeHeatmap.controls.heatmapOptions.colorScaleLabel', {
              defaultMessage: 'Color scale',
            })}
            options={scaleTypes}
            paramName="type"
            value={valueAxis.scale.type}
            setValue={setValueAxisScale}
            disabled={showElasticChartsOptions}
            data-test-subj="heatmapColorScale"
          />
        </EuiToolTip>
        <EuiSpacer size="s" />

        {!showElasticChartsOptions && (
          <SwitchOption
            label={i18n.translate('visTypeHeatmap.controls.heatmapOptions.scaleToDataBoundsLabel', {
              defaultMessage: 'Scale to data bounds',
            })}
            paramName="defaultYExtents"
            value={valueAxis.scale.defaultYExtents}
            setValue={setValueAxisScale}
            data-test-subj="heatmapScaleToDataBounds"
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
          label={i18n.translate('visTypeHeatmap.controls.heatmapOptions.colorsNumberLabel', {
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
          label={i18n.translate('visTypeHeatmap.controls.heatmapOptions.useCustomRangesLabel', {
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
      />
    </>
  );
};

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { HeatmapOptions as default };
