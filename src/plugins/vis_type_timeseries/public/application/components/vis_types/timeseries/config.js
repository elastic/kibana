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

import PropTypes from 'prop-types';
import React from 'react';
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
  EuiFormLabel,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { getDefaultQueryLanguage } from '../../lib/get_default_query_language';
import { QueryBarWrapper } from '../../query_bar_wrapper';

import { isPercentDisabled } from '../../lib/stacked';
import { STACKED_OPTIONS } from '../../../visualizations/constants/chart';

export const TimeseriesConfig = injectI18n(function (props) {
  const handleSelectChange = createSelectHandler(props.onChange);
  const handleTextChange = createTextHandler(props.onChange);
  const defaults = {
    fill: '',
    line_width: '',
    point_size: '',
    value_template: '{{value}}',
    offset_time: '',
    split_color_mode: 'kibana',
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

  const splitColorOptions = [
    {
      label: intl.formatMessage({
        id: 'visTypeTimeseries.timeSeries.defaultPaletteLabel',
        defaultMessage: 'Default palette',
      }),
      value: 'kibana',
    },
    {
      label: intl.formatMessage({
        id: 'visTypeTimeseries.timeSeries.rainbowLabel',
        defaultMessage: 'Rainbow',
      }),
      value: 'rainbow',
    },
    {
      label: intl.formatMessage({
        id: 'visTypeTimeseries.timeSeries.gradientLabel',
        defaultMessage: 'Gradient',
      }),
      value: 'gradient',
    },
  ];
  const selectedSplitColorOption = splitColorOptions.find((option) => {
    return model.split_color_mode === option.value;
  });

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
          <EuiFormLabel>
            <FormattedMessage
              id="visTypeTimeseries.timeSeries.chartLine.stepsLabel"
              defaultMessage="Steps"
            />
          </EuiFormLabel>
          <EuiSpacer size="s" />
          <YesNo value={model.steps} name="steps" onChange={props.onChange} />
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

  const seriesIndexPattern =
    props.model.override_index_pattern && props.model.series_index_pattern
      ? props.model.series_index_pattern
      : props.indexPatternForQuery;

  return (
    <div className="tvbAggRow">
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <DataFormatPicker onChange={handleSelectChange('formatter')} value={model.formatter} />
        </EuiFlexItem>
        <EuiFlexItem>
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
              fullWidth
              data-test-subj="tsvb_series_value"
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="s" />
      <EuiFlexItem>
        <EuiFormRow
          id={htmlId('series_filter')}
          label={
            <FormattedMessage
              id="visTypeTimeseries.timeSeries.filterLabel"
              defaultMessage="Filter"
            />
          }
          fullWidth
        >
          <QueryBarWrapper
            query={{
              language:
                model.filter && model.filter.language
                  ? model.filter.language
                  : getDefaultQueryLanguage(),
              query: model.filter && model.filter.query ? model.filter.query : '',
            }}
            onChange={(filter) => props.onChange({ filter })}
            indexPatterns={[seriesIndexPattern]}
          />
        </EuiFormRow>
      </EuiFlexItem>
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
          <EuiFormLabel>
            <FormattedMessage
              id="visTypeTimeseries.timeSeries.hideInLegendLabel"
              defaultMessage="Hide in legend"
            />
          </EuiFormLabel>
          <EuiSpacer size="s" />
          <YesNo value={model.hide_in_legend} name="hide_in_legend" onChange={props.onChange} />
        </EuiFlexItem>
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
            <EuiComboBox
              isClearable={false}
              options={splitColorOptions}
              selectedOptions={selectedSplitColorOption ? [selectedSplitColorOption] : []}
              onChange={handleSelectChange('split_color_mode')}
              singleSelection={{ asPlainText: true }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="s" />

      <EuiFlexGroup responsive={false} wrap={true}>
        <EuiFlexItem grow={false}>
          <EuiFormLabel>
            <FormattedMessage
              id="visTypeTimeseries.timeSeries.separateAxisLabel"
              defaultMessage="Separate axis?"
            />
          </EuiFormLabel>
          <EuiSpacer size="s" />
          <YesNo value={model.separate_axis} name="separate_axis" onChange={props.onChange} />
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
          <EuiFormLabel>
            <FormattedMessage
              id="visTypeTimeseries.timeSeries.overrideIndexPatternLabel"
              defaultMessage="Override Index Pattern?"
            />
          </EuiFormLabel>
          <EuiSpacer size="s" />
          <YesNo
            value={model.override_index_pattern}
            name="override_index_pattern"
            onChange={props.onChange}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <IndexPattern
            {...props}
            prefix="series_"
            disabled={!model.override_index_pattern}
            with-interval={true}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
});

TimeseriesConfig.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func,
  indexPatternForQuery: PropTypes.string,
  seriesQuantity: PropTypes.object,
};
