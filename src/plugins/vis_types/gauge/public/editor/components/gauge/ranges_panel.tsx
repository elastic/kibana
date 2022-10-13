/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  ColorRanges,
  SetColorRangeValue,
  SwitchOption,
  ColorSchemaOptions,
  PercentageModeOption,
} from '@kbn/vis-default-editor-plugin/public';
import { ColorSchemaParams, ColorSchemas, colorSchemas } from '@kbn/charts-plugin/public';
import { GaugeOptionsInternalProps } from '.';
import { Gauge } from '../../../types';

function RangesPanel({
  showElasticChartsOptions,
  setGaugeValue,
  setTouched,
  setValidity,
  setValue,
  stateParams,
  uiState,
}: GaugeOptionsInternalProps) {
  const setColorSchemaOptions = useCallback(
    <T extends keyof ColorSchemaParams>(paramName: T, value: ColorSchemaParams[T]) => {
      setGaugeValue(paramName, value as Gauge[T]);
      // set outline if color schema is changed to greys
      // if outline wasn't set explicitly yet
      if (
        paramName === 'colorSchema' &&
        (value as string) === ColorSchemas.Greys &&
        typeof stateParams.gauge.outline === 'undefined'
      ) {
        setGaugeValue('outline', true);
      }
    },
    [setGaugeValue, stateParams]
  );

  return (
    <EuiPanel paddingSize="s">
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="visTypeGauge.controls.gaugeOptions.rangesTitle"
            defaultMessage="Ranges"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <ColorRanges
        data-test-subj="gaugeColorRange"
        colorsRange={stateParams.gauge.colorsRange}
        setValue={setGaugeValue as SetColorRangeValue}
        setTouched={setTouched}
        setValidity={setValidity}
      />

      <SwitchOption
        disabled={showElasticChartsOptions || stateParams.gauge.colorsRange.length < 2}
        label={i18n.translate('visTypeGauge.controls.gaugeOptions.autoExtendRangeLabel', {
          defaultMessage: 'Auto extend range',
        })}
        tooltip={
          showElasticChartsOptions
            ? i18n.translate('visTypeGauge.controls.gaugeOptions.extendRangeTooltipNotAvailable', {
                defaultMessage:
                  'The new charts library supports only extended ranges. To disable it, please, enable the gauge legacy charts library advanced setting.',
              })
            : i18n.translate('visTypeGauge.controls.gaugeOptions.extendRangeTooltip', {
                defaultMessage: 'Extends range to the maximum value in your data.',
              })
        }
        paramName="extendRange"
        value={stateParams.gauge.extendRange}
        setValue={setGaugeValue}
      />

      <PercentageModeOption
        data-test-subj="gaugePercentageMode"
        percentageMode={stateParams.gauge.percentageMode}
        formatPattern={stateParams.gauge.percentageFormatPattern}
        setValue={setGaugeValue}
      />

      <ColorSchemaOptions
        disabled={stateParams.gauge.colorsRange.length < 2}
        colorSchema={stateParams.gauge.colorSchema}
        colorSchemas={colorSchemas}
        invertColors={stateParams.gauge.invertColors}
        uiState={uiState}
        setValue={setColorSchemaOptions}
      />

      <SwitchOption
        label={i18n.translate('visTypeGauge.controls.gaugeOptions.showOutline', {
          defaultMessage: 'Show outline',
        })}
        paramName="outline"
        value={stateParams.gauge.outline}
        setValue={setGaugeValue}
        disabled={showElasticChartsOptions}
        {...(showElasticChartsOptions
          ? {
              tooltip: i18n.translate(
                'visTypeGauge.controls.gaugeOptions.showOutlineNotAvailable',
                {
                  defaultMessage:
                    'The outline is not supported with the new charts library. Please, enable the gauge legacy charts library advanced setting.',
                }
              ),
            }
          : {})}
      />

      <SwitchOption
        label={i18n.translate('visTypeGauge.controls.gaugeOptions.showLegendLabel', {
          defaultMessage: 'Show legend',
        })}
        paramName="addLegend"
        value={stateParams.addLegend}
        setValue={setValue}
        disabled={showElasticChartsOptions}
        {...(showElasticChartsOptions
          ? {
              tooltip: i18n.translate('visTypeGauge.controls.gaugeOptions.showLegendNotAvailable', {
                defaultMessage:
                  'The legend is not supported with the new charts library. Please, enable the gauge legacy charts library advanced setting.',
              }),
            }
          : {})}
      />

      <SwitchOption
        label={i18n.translate('visTypeGauge.controls.gaugeOptions.showScaleLabel', {
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
