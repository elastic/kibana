/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiRange,
  EuiFormRow,
  EuiIconTip,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonGroup,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  BasicOptions,
  SwitchOption,
  SelectOption,
  PalettePicker,
  LongLegendOptions,
} from '../../../../../vis_default_editor/public';
import { VisEditorOptionsProps } from '../../../../../visualizations/public';
import { TruncateLabelsOption } from './truncate_labels';
import { PaletteRegistry } from '../../../../../charts/public';
import { DEFAULT_PERCENT_DECIMALS } from '../../../common';
import { PieTypeProps } from '../../types';
import {
  PieVisParams,
  LabelPositions,
  ValueFormats,
} from '../../../../../chart_expressions/expression_pie/common';

import { emptySizeRatioOptions, getLabelPositions, getValuesFormats } from '../collections';
import { getLegendPositions } from '../positions';

export interface PieOptionsProps extends VisEditorOptionsProps<PieVisParams>, PieTypeProps {}

const emptySizeRatioLabel = i18n.translate('visTypePie.editors.pie.emptySizeRatioLabel', {
  defaultMessage: 'Inner area size',
});

function DecimalSlider<ParamName extends string>({
  paramName,
  value,
  setValue,
}: {
  value: number;
  paramName: ParamName;
  setValue: (paramName: ParamName, value: number) => void;
}) {
  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate('visTypePie.editors.pie.decimalSliderLabel', {
        defaultMessage: 'Maximum decimal places for percent',
      })}
      data-test-subj="visTypePieValueDecimals"
    >
      <EuiRange
        value={value}
        min={0}
        max={4}
        showInput
        compressed
        onChange={(e) => {
          setValue(paramName, Number(e.currentTarget.value));
        }}
      />
    </EuiFormRow>
  );
}

const PieOptions = (props: PieOptionsProps) => {
  const { stateParams, setValue, aggs } = props;
  const setLabels = <T extends keyof PieVisParams['labels']>(
    paramName: T,
    value: PieVisParams['labels'][T]
  ) => setValue('labels', { ...stateParams.labels, [paramName]: value });
  const legendUiStateValue = props.uiState?.get('vis.legendOpen');
  const [palettesRegistry, setPalettesRegistry] = useState<PaletteRegistry | undefined>(undefined);
  const [legendVisibility, setLegendVisibility] = useState<boolean>(() => {
    const bwcLegendStateDefault = stateParams.addLegend == null ? false : stateParams.addLegend;
    return props.uiState?.get('vis.legendOpen', bwcLegendStateDefault) as boolean;
  });
  const hasSplitChart = Boolean(aggs?.aggs?.find((agg) => agg.schema === 'split' && agg.enabled));
  const segments = aggs?.aggs?.filter((agg) => agg.schema === 'segment' && agg.enabled) ?? [];

  useEffect(() => {
    setLegendVisibility(legendUiStateValue);
  }, [legendUiStateValue]);

  useEffect(() => {
    const fetchPalettes = async () => {
      const palettes = await props.palettes?.getPalettes();
      setPalettesRegistry(palettes);
    };
    fetchPalettes();
  }, [props.palettes]);

  const handleEmptySizeRatioChange = useCallback(
    (sizeId) => {
      const emptySizeRatio = emptySizeRatioOptions.find(({ id }) => id === sizeId)?.value;
      setValue('emptySizeRatio', emptySizeRatio);
    },
    [setValue]
  );

  return (
    <>
      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="visTypePie.editors.pie.pieSettingsTitle"
              defaultMessage="Pie settings"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <SwitchOption
          label={i18n.translate('visTypePie.editors.pie.donutLabel', {
            defaultMessage: 'Donut',
          })}
          paramName="isDonut"
          value={stateParams.isDonut}
          setValue={setValue}
        />
        {props.showElasticChartsOptions && stateParams.isDonut && (
          <EuiFormRow label={emptySizeRatioLabel} fullWidth>
            <EuiButtonGroup
              isFullWidth
              name="emptySizeRatio"
              buttonSize="compressed"
              legend={emptySizeRatioLabel}
              options={emptySizeRatioOptions}
              idSelected={
                emptySizeRatioOptions.find(({ value }) => value === stateParams.emptySizeRatio)
                  ?.id ?? 'emptySizeRatioOption-small'
              }
              onChange={handleEmptySizeRatioChange}
              data-test-subj="visTypePieEmptySizeRatioButtonGroup"
            />
          </EuiFormRow>
        )}
        <BasicOptions {...props} legendPositions={getLegendPositions} />
        {props.showElasticChartsOptions && (
          <>
            <EuiFormRow>
              <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                <EuiFlexItem grow={false}>
                  <SwitchOption
                    label={i18n.translate('visTypePie.editors.pie.distinctColorsLabel', {
                      defaultMessage: 'Use distinct colors per slice',
                    })}
                    paramName="distinctColors"
                    value={stateParams.distinctColors}
                    disabled={segments?.length <= 1 && !hasSplitChart}
                    setValue={setValue}
                    data-test-subj="visTypePiedistinctColorsSwitch"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIconTip
                    content="Use with multi-layer chart or multiple charts."
                    position="top"
                    type="iInCircle"
                    color="subdued"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFormRow>
            <SwitchOption
              label={i18n.translate('visTypePie.editors.pie.addLegendLabel', {
                defaultMessage: 'Show legend',
              })}
              paramName="addLegend"
              value={legendVisibility}
              setValue={(paramName, value) => {
                setLegendVisibility(value);
                setValue(paramName, value);
              }}
              data-test-subj="visTypePieAddLegendSwitch"
            />
            <SwitchOption
              label={i18n.translate('visTypePie.editors.pie.nestedLegendLabel', {
                defaultMessage: 'Nest legend',
              })}
              paramName="nestedLegend"
              value={stateParams.nestedLegend}
              disabled={!stateParams.addLegend}
              setValue={(paramName, value) => {
                if (props.trackUiMetric) {
                  props.trackUiMetric(METRIC_TYPE.CLICK, 'nested_legend_switched');
                }
                setValue(paramName, value);
              }}
              data-test-subj="visTypePieNestedLegendSwitch"
            />
            <LongLegendOptions
              data-test-subj="pieLongLegendsOptions"
              truncateLegend={stateParams.truncateLegend ?? true}
              maxLegendLines={stateParams.maxLegendLines ?? 1}
              setValue={setValue}
            />
          </>
        )}
        {props.showElasticChartsOptions && palettesRegistry && (
          <PalettePicker
            palettes={palettesRegistry}
            activePalette={stateParams.palette}
            paramName="palette"
            setPalette={(paramName, value) => {
              if (props.trackUiMetric) {
                props.trackUiMetric(METRIC_TYPE.CLICK, 'palette_selected');
              }
              setValue(paramName, value);
            }}
          />
        )}
      </EuiPanel>

      <EuiSpacer size="s" />

      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="visTypePie.editors.pie.labelsSettingsTitle"
              defaultMessage="Labels settings"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <SwitchOption
          label={i18n.translate('visTypePie.editors.pie.showLabelsLabel', {
            defaultMessage: 'Show labels',
          })}
          paramName="show"
          value={stateParams.labels.show}
          setValue={setLabels}
        />
        {props.showElasticChartsOptions && (
          <SelectOption
            label={i18n.translate('visTypePie.editors.pie.labelPositionLabel', {
              defaultMessage: 'Label position',
            })}
            disabled={!stateParams.labels.show || hasSplitChart}
            options={getLabelPositions}
            paramName="position"
            value={
              hasSplitChart
                ? LabelPositions.INSIDE
                : stateParams.labels.position || LabelPositions.DEFAULT
            }
            setValue={(paramName, value) => {
              if (props.trackUiMetric) {
                props.trackUiMetric(METRIC_TYPE.CLICK, 'label_position_selected');
              }
              setLabels(paramName, value);
            }}
            data-test-subj="visTypePieLabelPositionSelect"
          />
        )}
        <SwitchOption
          label={i18n.translate('visTypePie.editors.pie.showTopLevelOnlyLabel', {
            defaultMessage: 'Show top level only',
          })}
          disabled={
            !stateParams.labels.show ||
            (props.showElasticChartsOptions &&
              stateParams.labels.position === LabelPositions.INSIDE)
          }
          paramName="last_level"
          value={stateParams.labels.last_level}
          setValue={setLabels}
          data-test-subj="visTypePieTopLevelSwitch"
        />
        <SwitchOption
          label={i18n.translate('visTypePie.editors.pie.showValuesLabel', {
            defaultMessage: 'Show values',
          })}
          disabled={!stateParams.labels.show}
          paramName="values"
          value={stateParams.labels.values}
          setValue={setLabels}
        />
        {props.showElasticChartsOptions && (
          <>
            <SelectOption
              label={i18n.translate('visTypePie.editors.pie.valueFormatsLabel', {
                defaultMessage: 'Values',
              })}
              disabled={!stateParams.labels.values}
              options={getValuesFormats}
              paramName="valuesFormat"
              value={stateParams.labels.valuesFormat || ValueFormats.PERCENT}
              setValue={(paramName, value) => {
                if (props.trackUiMetric) {
                  props.trackUiMetric(METRIC_TYPE.CLICK, 'values_format_selected');
                }
                setLabels(paramName, value);
              }}
              data-test-subj="visTypePieValueFormatsSelect"
            />
            <DecimalSlider
              paramName="percentDecimals"
              value={stateParams.labels.percentDecimals ?? DEFAULT_PERCENT_DECIMALS}
              setValue={setLabels}
            />
          </>
        )}
        <TruncateLabelsOption
          value={stateParams.labels.truncate}
          setValue={setLabels}
          disabled={
            props.showElasticChartsOptions && stateParams.labels.position === LabelPositions.INSIDE
          }
        />
      </EuiPanel>
    </>
  );
};

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { PieOptions as default };
