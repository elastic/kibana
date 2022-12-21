/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { Position } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PaletteRegistry } from '@kbn/coloring';
import {
  BasicOptions,
  SwitchOption,
  SelectOption,
  PalettePicker,
  LongLegendOptions,
  LegendSizeSettings,
} from '@kbn/vis-default-editor-plugin/public';
import { LegendSize, VisEditorOptionsProps } from '@kbn/visualizations-plugin/public';
import {
  PartitionVisParams,
  LabelPositions,
  ValueFormats,
  LegendDisplay,
} from '@kbn/expression-partition-vis-plugin/common';
import { TruncateLabelsOption } from './truncate_labels';
import { DEFAULT_PERCENT_DECIMALS } from '../../../common';
import { PieTypeProps } from '../../types';

import { emptySizeRatioOptions, getLabelPositions, getValuesFormats } from '../collections';
import { getLegendPositions } from '../positions';

export interface PieOptionsProps extends VisEditorOptionsProps<PartitionVisParams>, PieTypeProps {}

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
  const setLabels = <T extends keyof PartitionVisParams['labels']>(
    paramName: T,
    value: PartitionVisParams['labels'][T]
  ) => setValue('labels', { ...stateParams.labels, [paramName]: value });
  const legendUiStateValue = props.uiState?.get('vis.legendOpen');
  const [palettesRegistry, setPalettesRegistry] = useState<PaletteRegistry | undefined>(undefined);
  const [legendVisibility, setLegendVisibility] = useState<boolean>(() => {
    const bwcLegendStateDefault = stateParams.legendDisplay === LegendDisplay.SHOW;
    return props.uiState?.get('vis.legendOpen', bwcLegendStateDefault);
  });
  const hasSplitChart = Boolean(aggs?.aggs?.find((agg) => agg.schema === 'split' && agg.enabled));
  const segments = aggs?.aggs?.filter((agg) => agg.schema === 'segment' && agg.enabled) ?? [];

  const legendSize = stateParams.legendSize;
  const [hadAutoLegendSize] = useState(() => legendSize === LegendSize.AUTO);

  const getLegendDisplay = useCallback(
    (isVisible: boolean) => (isVisible ? LegendDisplay.SHOW : LegendDisplay.HIDE),
    []
  );

  useEffect(() => {
    setLegendVisibility(legendUiStateValue ?? stateParams.legendDisplay === LegendDisplay.SHOW);
  }, [legendUiStateValue, stateParams.legendDisplay]);

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

  const handleLegendSizeChange = useCallback((size) => setValue('legendSize', size), [setValue]);

  const handleLegendDisplayChange = useCallback(
    (name: keyof PartitionVisParams, show: boolean) => {
      setLegendVisibility(show);

      const legendDisplay = getLegendDisplay(show);
      if (legendDisplay === stateParams[name]) {
        setValue(name, getLegendDisplay(!show));
      }
      setValue(name, legendDisplay);

      props.uiState?.set('vis.legendOpen', show);
    },
    [getLegendDisplay, props.uiState, setValue, stateParams]
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
          data-test-subj="visTypePieIsDonut"
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
              label={i18n.translate('visTypePie.editors.pie.legendDisplayLabel', {
                defaultMessage: 'Show legend',
              })}
              paramName="legendDisplay"
              value={legendVisibility}
              setValue={handleLegendDisplayChange}
              data-test-subj="visTypePieAddLegendSwitch"
            />
            <SwitchOption
              label={i18n.translate('visTypePie.editors.pie.nestedLegendLabel', {
                defaultMessage: 'Nest legend',
              })}
              paramName="nestedLegend"
              value={stateParams.nestedLegend}
              disabled={stateParams.legendDisplay === LegendDisplay.HIDE}
              setValue={(paramName, value) => {
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
            <LegendSizeSettings
              legendSize={legendSize}
              onLegendSizeChange={handleLegendSizeChange}
              isVerticalLegend={
                stateParams.legendPosition === Position.Left ||
                stateParams.legendPosition === Position.Right
              }
              showAutoOption={hadAutoLegendSize}
            />
          </>
        )}
        {props.showElasticChartsOptions && palettesRegistry && (
          <PalettePicker
            palettes={palettesRegistry}
            activePalette={stateParams.palette}
            paramName="palette"
            setPalette={(paramName, value) => {
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
