/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect } from 'react';
import { METRIC_TYPE } from '@kbn/analytics';
import { EuiPanel, EuiTitle, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  BasicOptions,
  SwitchOption,
  SelectOption,
  PalettePicker,
} from '../../../../vis_default_editor/public';
import { VisEditorOptionsProps } from '../../../../visualizations/public';
import { TruncateLabelsOption } from './truncate_labels';
import { PaletteRegistry } from '../../../../charts/public';
import { PieVisParams, LabelPositions, ValueFormats, PieTypeProps } from '../../types';
import { getLabelPositions, getValuesFormats } from '../collections';
import { getLegendPositions } from '../positions';

export interface PieOptionsProps extends VisEditorOptionsProps<PieVisParams>, PieTypeProps {}

const PieOptions = (props: PieOptionsProps) => {
  const { stateParams, setValue } = props;
  const setLabels = <T extends keyof PieVisParams['labels']>(
    paramName: T,
    value: PieVisParams['labels'][T]
  ) => setValue('labels', { ...stateParams.labels, [paramName]: value });

  const [palettesRegistry, setPalettesRegistry] = useState<PaletteRegistry | undefined>(undefined);

  useEffect(() => {
    const fetchPalettes = async () => {
      const palettes = await props.palettes?.getPalettes();
      setPalettesRegistry(palettes);
    };
    fetchPalettes();
  }, [props.palettes]);

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
        <BasicOptions {...props} legendPositions={getLegendPositions} />
        {props.showElasticChartsOptions && (
          <SwitchOption
            label={i18n.translate('visTypePie.editors.pie.nestedLegendLabel', {
              defaultMessage: 'Nested legend',
            })}
            paramName="nestedLegend"
            value={stateParams.nestedLegend}
            setValue={(paramName, value) => {
              if (props.trackUiMetric) {
                props.trackUiMetric(METRIC_TYPE.CLICK, 'nested_legend_switched');
              }
              setValue(paramName, value);
            }}
            data-test-subj="visTypePieNestedLegendSwitch"
          />
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
            disabled={!stateParams.labels.show}
            options={getLabelPositions}
            paramName="position"
            value={stateParams.labels.position || LabelPositions.DEFAULT}
            setValue={(paramName, value) => {
              if (props.trackUiMetric) {
                props.trackUiMetric(METRIC_TYPE.CLICK, 'label_position_selected');
              }
              setLabels(paramName, value);
            }}
            data-test-subj="visTypePieLabelPositionSelect"
          />
        )}
        {!props.showElasticChartsOptions && (
          <SwitchOption
            label={i18n.translate('visTypePie.editors.pie.showTopLevelOnlyLabel', {
              defaultMessage: 'Show top level only',
            })}
            paramName="last_level"
            value={stateParams.labels.last_level}
            setValue={setLabels}
            data-test-subj="visTypePieTopLevelSwitch"
          />
        )}
        <SwitchOption
          label={i18n.translate('visTypePie.editors.pie.showValuesLabel', {
            defaultMessage: 'Show values',
          })}
          paramName="values"
          value={stateParams.labels.values}
          setValue={setLabels}
        />
        {props.showElasticChartsOptions && (
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
        )}
        <TruncateLabelsOption value={stateParams.labels.truncate} setValue={setLabels} />
      </EuiPanel>
    </>
  );
};

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { PieOptions as default };
