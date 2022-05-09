/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';

import PropTypes from 'prop-types';
import { last } from 'lodash';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { DATA_FORMATTERS } from '../../../../../common/enums';
import { DataFormatPicker } from '../../data_format_picker';
import { createSelectHandler } from '../../lib/create_select_handler';
import { YesNo } from '../../yes_no';
import { createTextHandler } from '../../lib/create_text_handler';
import { IndexPattern } from '../../index_pattern';
import {
  htmlIdGenerator,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiFormRow,
  EuiCode,
  EuiHorizontalRule,
  EuiFieldNumber,
} from '@elastic/eui';
import { FormattedMessage, injectI18n } from '@kbn/i18n-react';
import { SeriesConfigQueryBarWithIgnoreGlobalFilter } from '../../series_config_query_bar_with_ignore_global_filter';
import { PalettePicker } from '../../palette_picker';
import { getCharts } from '../../../../services';
import { checkIfNumericMetric } from '../../lib/check_if_numeric_metric';
import { isPercentDisabled } from '../../lib/stacked';
import { STACKED_OPTIONS } from '../../../visualizations/constants/chart';

export const TimeseriesConfig = injectI18n(function (props) {
  const handleSelectChange = createSelectHandler(props.onChange);
  const handleTextChange = createTextHandler(props.onChange);
  const defaults = {
    value_template: '{{value}}',
    offset_time: '',
    axis_min: '',
    axis_max: '',
    stacked: STACKED_OPTIONS.NONE,
    steps: 0,
  };
  const model = { ...defaults, ...props.model };
  const htmlId = htmlIdGenerator();
  const { intl } = props;
  const stackedOptions = [
    {
      label: intl.formatMessage({
        id: 'visTypeTimeseries.timeSeries.noneLabel',
        defaultMessage: 'None',
      }),
      value: STACKED_OPTIONS.NONE,
    },
    {
      label: intl.formatMessage({
        id: 'visTypeTimeseries.timeSeries.stackedLabel',
        defaultMessage: 'Stacked',
      }),
      value: STACKED_OPTIONS.STACKED,
    },
    {
      label: intl.formatMessage({
        id: 'visTypeTimeseries.timeSeries.stackedWithinSeriesLabel',
        defaultMessage: 'Stacked within series',
      }),
      value: STACKED_OPTIONS.STACKED_WITHIN_SERIES,
    },
    {
      label: intl.formatMessage({
        id: 'visTypeTimeseries.timeSeries.percentLabel',
        defaultMessage: 'Percent',
      }),
      value: STACKED_OPTIONS.PERCENT,
      disabled: isPercentDisabled(props.seriesQuantity[model.id]),
    },
  ];
  const selectedStackedOption = stackedOptions.find((option) => {
    return model.stacked === option.value;
  });

  const positionOptions = [
    {
      label: intl.formatMessage({
        id: 'visTypeTimeseries.timeSeries.rightLabel',
        defaultMessage: 'Right',
      }),
      value: 'right',
    },
    {
      label: intl.formatMessage({
        id: 'visTypeTimeseries.timeSeries.leftLabel',
        defaultMessage: 'Left',
      }),
      value: 'left',
    },
  ];
  const selectedAxisPosOption = positionOptions.find((option) => {
    return model.axis_position === option.value;
  });

  const chartTypeOptions = [
    {
      label: intl.formatMessage({
        id: 'visTypeTimeseries.timeSeries.barLabel',
        defaultMessage: 'Bar',
      }),
      value: 'bar',
    },
    {
      label: intl.formatMessage({
        id: 'visTypeTimeseries.timeSeries.lineLabel',
        defaultMessage: 'Line',
      }),
      value: 'line',
    },
  ];
  const selectedChartTypeOption = chartTypeOptions.find((option) => {
    return model.chart_type === option.value;
  });
  const { palettes } = getCharts();
  const [palettesRegistry, setPalettesRegistry] = useState(null);

  useEffect(() => {
    const fetchPalettes = async () => {
      const palettesService = await palettes.getPalettes();
      setPalettesRegistry(palettesService);
    };
    fetchPalettes();
  }, [palettes]);

  const handlePaletteChange = (val) => {
    props.onChange({
      split_color_mode: null,
      palette: val,
    });
  };

  let type;

  if (model.chart_type === 'line') {
    type = (
      <EuiFlexGroup gutterSize="s" responsive={false} wrap={true}>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id={htmlId('chartType')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.timeSeries.chartLine.chartTypeLabel"
                defaultMessage="Chart type"
              />
            }
          >
            <EuiComboBox
              isClearable={false}
              options={chartTypeOptions}
              selectedOptions={selectedChartTypeOption ? [selectedChartTypeOption] : []}
              onChange={handleSelectChange('chart_type')}
              singleSelection={{ asPlainText: true }}
              data-test-subj="seriesChartTypeComboBox"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id={htmlId('stacked')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.timeSeries.chartLine.stackedLabel"
                defaultMessage="Stacked"
              />
            }
          >
            <EuiComboBox
              isClearable={false}
              options={stackedOptions}
              selectedOptions={selectedStackedOption ? [selectedStackedOption] : []}
              onChange={handleSelectChange('stacked')}
              singleSelection={{ asPlainText: true }}
              data-test-subj="seriesStackedComboBox"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id={htmlId('fill')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.timeSeries.chartLine.fillLabel"
                defaultMessage="Fill (0 to 1)"
              />
            }
          >
            <EuiFieldNumber
              step={0.1}
              onChange={handleTextChange('fill')}
              value={Number(model.fill)}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id={htmlId('lineWidth')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.timeSeries.chartLine.lineWidthLabel"
                defaultMessage="Line width"
              />
            }
          >
            <EuiFieldNumber
              onChange={handleTextChange('line_width')}
              value={Number(model.line_width)}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id={htmlId('pointSize')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.timeSeries.chartLine.pointSizeLabel"
                defaultMessage="Point size"
              />
            }
          >
            <EuiFieldNumber
              onChange={handleTextChange('point_size')}
              value={Number(model.point_size)}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate('visTypeTimeseries.timeSeries.chartLine.stepsLabel', {
              defaultMessage: 'Steps',
            })}
          >
            <YesNo value={model.steps} name="steps" onChange={props.onChange} />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
  if (model.chart_type === 'bar') {
    type = (
      <EuiFlexGroup gutterSize="s" responsive={false} wrap={true}>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id={htmlId('chartType')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.timeSeries.chartBar.chartTypeLabel"
                defaultMessage="Chart type"
              />
            }
          >
            <EuiComboBox
              isClearable={false}
              options={chartTypeOptions}
              selectedOptions={selectedChartTypeOption ? [selectedChartTypeOption] : []}
              onChange={handleSelectChange('chart_type')}
              singleSelection={{ asPlainText: true }}
              data-test-subj="seriesChartTypeComboBox"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id={htmlId('stacked')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.timeSeries.chartBar.stackedLabel"
                defaultMessage="Stacked"
              />
            }
          >
            <EuiComboBox
              isClearable={false}
              options={stackedOptions}
              selectedOptions={selectedStackedOption ? [selectedStackedOption] : []}
              onChange={handleSelectChange('stacked')}
              singleSelection={{ asPlainText: true }}
              data-test-subj="seriesStackedComboBox"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id={htmlId('fill')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.timeSeries.chartBar.fillLabel"
                defaultMessage="Fill (0 to 1)"
              />
            }
          >
            <EuiFieldNumber
              step={0.1}
              onChange={handleTextChange('fill')}
              value={Number(model.fill)}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id={htmlId('lineWidth')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.timeSeries.chartBar.lineWidthLabel"
                defaultMessage="Line width"
              />
            }
          >
            <EuiFieldNumber
              onChange={handleTextChange('line_width')}
              value={Number(model.line_width)}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const disableSeparateYaxis = model.separate_axis ? false : true;

  const seriesIndexPattern = props.model.override_index_pattern
    ? props.model.series_index_pattern
    : props.indexPatternForQuery;

  const changeModelFormatter = useCallback((formatter) => props.onChange({ formatter }), [props]);
  const isNumericMetric = useMemo(
    () => checkIfNumericMetric(last(model.metrics), props.fields, seriesIndexPattern),
    [model.metrics, props.fields, seriesIndexPattern]
  );
  const isKibanaIndexPattern = props.panel.use_kibana_indexes || seriesIndexPattern === '';

  const { indexPatternForQuery, onChange } = props;
  const onChangeOverride = useCallback(
    (partialState) => {
      const stateUpdate = { ...partialState };
      const isEnabling = partialState.override_index_pattern;
      if (isEnabling && !model.series_index_pattern) {
        stateUpdate.series_index_pattern = indexPatternForQuery;
      }
      onChange(stateUpdate);
    },
    [model.series_index_pattern, indexPatternForQuery, onChange]
  );

  const initialPalette = model.palette ?? {
    type: 'palette',
    name: 'default',
  };

  const palette = {
    ...initialPalette,
    name:
      model.split_color_mode === 'kibana'
        ? 'kibana_palette'
        : model.split_color_mode || initialPalette.name,
  };

  return (
    <div className="tvbAggRow">
      <EuiFlexGroup gutterSize="s">
        <DataFormatPicker
          formatterValue={model.formatter}
          changeModelFormatter={changeModelFormatter}
          shouldIncludeDefaultOption={isKibanaIndexPattern}
          shouldIncludeNumberOptions={isNumericMetric}
        />
        <EuiFlexItem grow={3}>
          <EuiFormRow
            id={htmlId('template')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.timeSeries.templateLabel"
                defaultMessage="Template"
              />
            }
            helpText={
              <span>
                <FormattedMessage
                  id="visTypeTimeseries.timeSeries.templateHelpText"
                  defaultMessage="eg.{templateExample}"
                  values={{ templateExample: <EuiCode>{'{{value}}/s'}</EuiCode> }}
                />
              </span>
            }
            fullWidth
          >
            <EuiFieldText
              onChange={handleTextChange('value_template')}
              value={model.value_template}
              disabled={model.formatter === DATA_FORMATTERS.DEFAULT}
              fullWidth
              data-test-subj="tsvb_series_value"
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="s" />
      <SeriesConfigQueryBarWithIgnoreGlobalFilter
        model={model}
        onChange={props.onChange}
        panel={props.panel}
        indexPatternForQuery={seriesIndexPattern}
      />
      <EuiHorizontalRule margin="s" />

      {type}

      <EuiHorizontalRule margin="s" />

      <EuiFlexGroup responsive={false} wrap={true}>
        <EuiFlexItem grow={true}>
          <EuiFormRow
            id={htmlId('offset')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.timeSeries.offsetSeriesTimeLabel"
                defaultMessage="Offset series time by (1m, 1h, 1w, 1d)"
                description="1m, 1h, 1w, 1d are required values and must not be translated."
              />
            }
          >
            <EuiFieldText
              data-test-subj="offsetTimeSeries"
              onChange={handleTextChange('offset_time')}
              value={model.offset_time}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiFormRow
            label={i18n.translate('visTypeTimeseries.timeSeries.hideInLegendLabel', {
              defaultMessage: 'Hide in legend',
            })}
          >
            <YesNo value={model.hide_in_legend} name="hide_in_legend" onChange={props.onChange} />
          </EuiFormRow>
        </EuiFlexItem>
        {palettesRegistry && (
          <EuiFlexItem grow={true}>
            <EuiFormRow
              id={htmlId('splitColor')}
              label={
                <FormattedMessage
                  id="visTypeTimeseries.timeSeries.splitColorThemeLabel"
                  defaultMessage="Split color theme"
                />
              }
            >
              <PalettePicker
                palettes={palettesRegistry}
                activePalette={palette}
                setPalette={handlePaletteChange}
                color={model.color}
              />
            </EuiFormRow>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiHorizontalRule margin="s" />

      <EuiFlexGroup responsive={false} wrap={true}>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate('visTypeTimeseries.timeSeries.separateAxisLabel', {
              defaultMessage: 'Separate axis?',
            })}
          >
            <YesNo value={model.separate_axis} name="separate_axis" onChange={props.onChange} />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id={htmlId('axisMin')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.timeSeries.axisMinLabel"
                defaultMessage="Axis min"
              />
            }
          >
            {/*
              EUITODO: The following input couldn't be converted to EUI because of type mis-match.
              It accepts a null value, but is passed a empty string.
            */}
            <input
              className="tvbAgg__input"
              type="number"
              disabled={disableSeparateYaxis}
              onChange={handleTextChange('axis_min')}
              value={model.axis_min}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id={htmlId('axisMax')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.timeSeries.axisMaxLabel"
                defaultMessage="Axis max"
              />
            }
          >
            {/*
              EUITODO: The following input couldn't be converted to EUI because of type mis-match.
              It accepts a null value, but is passed a empty string.
            */}
            <input
              className="tvbAgg__input"
              disabled={disableSeparateYaxis}
              onChange={handleTextChange('axis_max')}
              value={model.axis_max}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id={htmlId('axisPos')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.timeSeries.axisPositionLabel"
                defaultMessage="Axis position"
              />
            }
          >
            <EuiComboBox
              isClearable={false}
              isDisabled={disableSeparateYaxis}
              options={positionOptions}
              selectedOptions={selectedAxisPosOption ? [selectedAxisPosOption] : []}
              onChange={handleSelectChange('axis_position')}
              singleSelection={{ asPlainText: true }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="s" />

      <EuiFlexGroup gutterSize="s" responsive={false} wrap={true}>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate('visTypeTimeseries.timeSeries.overrideDataViewLabel', {
              defaultMessage: 'Override data view?',
            })}
          >
            <YesNo
              value={model.override_index_pattern}
              name="override_index_pattern"
              onChange={onChangeOverride}
              data-test-subj="seriesOverrideIndexPattern"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <IndexPattern
            {...props}
            prefix="series_"
            disabled={!model.override_index_pattern}
            allowLevelOfDetail={true}
            baseIndexPattern={indexPatternForQuery}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
});

TimeseriesConfig.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  panel: PropTypes.object,
  onChange: PropTypes.func,
  indexPatternForQuery: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
  seriesQuantity: PropTypes.object,
};
