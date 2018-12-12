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
import DataFormatPicker from '../../data_format_picker';
import createSelectHandler from '../../lib/create_select_handler';
import YesNo from '../../yes_no';
import createTextHandler from '../../lib/create_text_handler';
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

const TimeseriesConfig = injectI18n(function (props) {
  const handleSelectChange = createSelectHandler(props.onChange);
  const handleTextChange = createTextHandler(props.onChange);

  const defaults = {
    fill: '',
    line_width: '',
    point_size: '',
    value_template: '{{value}}',
    offset_time: '',
    split_color_mode: 'gradient',
    axis_min: '',
    axis_max: '',
    stacked: 'none',
    steps: 0
  };
  const model = { ...defaults, ...props.model };
  const htmlId = htmlIdGenerator();
  const { intl } = props;

  const stackedOptions = [
    { label: intl.formatMessage({ id: 'tsvb.timeSeries.noneLabel', defaultMessage: 'None' }), value: 'none' },
    { label: intl.formatMessage({ id: 'tsvb.timeSeries.stackedLabel', defaultMessage: 'Stacked' }), value: 'stacked' },
    { label: intl.formatMessage({ id: 'tsvb.timeSeries.percentLabel', defaultMessage: 'Percent' }), value: 'percent' }
  ];
  const selectedStackedOption = stackedOptions.find(option => {
    return model.stacked === option.value;
  });

  const positionOptions = [
    { label: intl.formatMessage({ id: 'tsvb.timeSeries.rightLabel', defaultMessage: 'Right' }), value: 'right' },
    { label: intl.formatMessage({ id: 'tsvb.timeSeries.leftLabel', defaultMessage: 'Left' }), value: 'left' }
  ];
  const selectedAxisPosOption = positionOptions.find(option => {
    return model.axis_position === option.value;
  });

  const chartTypeOptions = [
    { label: intl.formatMessage({ id: 'tsvb.timeSeries.barLabel', defaultMessage: 'Bar' }), value: 'bar' },
    { label: intl.formatMessage({ id: 'tsvb.timeSeries.lineLabel', defaultMessage: 'Line' }), value: 'line' }
  ];
  const selectedChartTypeOption = chartTypeOptions.find(option => {
    return model.chart_type === option.value;
  });

  const splitColorOptions = [
    { label: intl.formatMessage({ id: 'tsvb.timeSeries.gradientLabel', defaultMessage: 'Gradient' }), value: 'gradient' },
    { label: intl.formatMessage({ id: 'tsvb.timeSeries.rainbowLabel', defaultMessage: 'Rainbow' }), value: 'rainbow' }
  ];
  const selectedSplitColorOption = splitColorOptions.find(option => {
    return model.split_color_mode === option.value;
  });

  let type;
  if (model.chart_type === 'line') {
    type = (
      <EuiFlexGroup gutterSize="s" responsive={false} wrap={true}>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id={htmlId('chartType')}
            label={(<FormattedMessage
              id="tsvb.timeSeries.chartLine.chartTypeLabel"
              defaultMessage="Chart type"
            />)}
          >
            <EuiComboBox
              isClearable={false}
              options={chartTypeOptions}
              selectedOptions={selectedChartTypeOption ? [selectedChartTypeOption] : []}
              onChange={handleSelectChange('chart_type')}
              singleSelection={true}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id={htmlId('stacked')}
            label={(<FormattedMessage
              id="tsvb.timeSeries.chartLine.stackedLabel"
              defaultMessage="Stacked"
            />)}
          >
            <EuiComboBox
              isClearable={false}
              options={stackedOptions}
              selectedOptions={selectedStackedOption ? [selectedStackedOption] : []}
              onChange={handleSelectChange('stacked')}
              singleSelection={true}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id={htmlId('fill')}
            label={(<FormattedMessage
              id="tsvb.timeSeries.chartLine.fillLabel"
              defaultMessage="Fill (0 to 1)"
            />)}
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
            label={(<FormattedMessage
              id="tsvb.timeSeries.chartLine.lineWidthLabel"
              defaultMessage="Line width"
            />)}
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
            label={(<FormattedMessage
              id="tsvb.timeSeries.chartLine.pointSizeLabel"
              defaultMessage="Point size"
            />)}
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
              id="tsvb.timeSeries.chartLine.stepsLabel"
              defaultMessage="Steps"
            />
          </EuiFormLabel>
          <EuiSpacer size="s" />
          <YesNo
            value={model.steps}
            name="steps"
            onChange={props.onChange}
          />
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
            label={(<FormattedMessage
              id="tsvb.timeSeries.chartBar.chartTypeLabel"
              defaultMessage="Chart type"
            />)}
          >
            <EuiComboBox
              isClearable={false}
              options={chartTypeOptions}
              selectedOptions={selectedChartTypeOption ? [selectedChartTypeOption] : []}
              onChange={handleSelectChange('chart_type')}
              singleSelection={true}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id={htmlId('stacked')}
            label={(<FormattedMessage
              id="tsvb.timeSeries.chartBar.stackedLabel"
              defaultMessage="Stacked"
            />)}
          >
            <EuiComboBox
              isClearable={false}
              options={stackedOptions}
              selectedOptions={selectedStackedOption ? [selectedStackedOption] : []}
              onChange={handleSelectChange('stacked')}
              singleSelection={true}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id={htmlId('fill')}
            label={(<FormattedMessage
              id="tsvb.timeSeries.chartBar.fillLabel"
              defaultMessage="Fill (0 to 1)"
            />)}
          >
            <EuiFieldNumber
              step={0.5}
              onChange={handleTextChange('fill')}
              value={Number(model.fill)}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id={htmlId('lineWidth')}
            label={(<FormattedMessage
              id="tsvb.timeSeries.chartBar.lineWidthLabel"
              defaultMessage="Line width"
            />)}
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

  return (
    <div className="tvbAggRow">

      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <DataFormatPicker
            onChange={handleSelectChange('formatter')}
            value={model.formatter}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('template')}
            label={(<FormattedMessage
              id="tsvb.timeSeries.templateLabel"
              defaultMessage="Template"
            />)}
            helpText={(
              <span>
                <FormattedMessage
                  id="tsvb.timeSeries.templateHelpText"
                  defaultMessage="eg.{templateExample}"
                  values={{ templateExample: (<EuiCode>{'{{value}}/s'}</EuiCode>) }}
                />
              </span>
            )}
            fullWidth
          >
            <EuiFieldText
              onChange={handleTextChange('value_template')}
              value={model.value_template}
              fullWidth
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="s" />

      <EuiFormRow
        id={htmlId('series_filter')}
        label={(<FormattedMessage
          id="tsvb.timeSeries.filterLabel"
          defaultMessage="Filter"
        />)}
        fullWidth
      >
        <EuiFieldText
          onChange={handleTextChange('filter')}
          value={model.filter}
          fullWidth
        />
      </EuiFormRow>

      <EuiHorizontalRule margin="s" />

      { type }

      <EuiHorizontalRule margin="s" />

      <EuiFlexGroup responsive={false} wrap={true}>
        <EuiFlexItem grow={true}>
          <EuiFormRow
            id={htmlId('offset')}
            label={(<FormattedMessage
              id="tsvb.timeSeries.offsetSeriesTimeLabel"
              defaultMessage="Offset series time by (1m, 1h, 1w, 1d)"
              description="1m, 1h, 1w, 1d are required values and must not be translated."
            />)}
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
              id="tsvb.timeSeries.hideInLegendLabel"
              defaultMessage="Hide in legend"
            />
          </EuiFormLabel>
          <EuiSpacer size="s" />
          <YesNo
            value={model.hide_in_legend}
            name="hide_in_legend"
            onChange={props.onChange}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiFormRow
            id={htmlId('splitColor')}
            label={(<FormattedMessage
              id="tsvb.timeSeries.splitColorThemeLabel"
              defaultMessage="Split color theme"
            />)}
          >
            <EuiComboBox
              isClearable={false}
              options={splitColorOptions}
              selectedOptions={selectedSplitColorOption ? [selectedSplitColorOption] : []}
              onChange={handleSelectChange('split_color_mode')}
              singleSelection={true}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="s" />

      <EuiFlexGroup responsive={false} wrap={true}>
        <EuiFlexItem grow={false}>
          <EuiFormLabel>
            <FormattedMessage
              id="tsvb.timeSeries.separateAxisLabel"
              defaultMessage="Separate axis?"
            />
          </EuiFormLabel>
          <EuiSpacer size="s" />
          <YesNo
            value={model.separate_axis}
            name="separate_axis"
            onChange={props.onChange}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id={htmlId('axisMin')}
            label={(<FormattedMessage
              id="tsvb.timeSeries.axisMinLabel"
              defaultMessage="Axis min"
            />)}
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
            label={(<FormattedMessage
              id="tsvb.timeSeries.axisMaxLabel"
              defaultMessage="Axis max"
            />)}
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
            label={(<FormattedMessage
              id="tsvb.timeSeries.axisPositionLabel"
              defaultMessage="Axis position"
            />)}
          >
            <EuiComboBox
              isClearable={false}
              isDisabled={disableSeparateYaxis}
              options={positionOptions}
              selectedOptions={selectedAxisPosOption ? [selectedAxisPosOption] : []}
              onChange={handleSelectChange('axis_position')}
              singleSelection={true}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="s" />

      <EuiFlexGroup gutterSize="s" responsive={false} wrap={true}>
        <EuiFlexItem grow={false}>
          <EuiFormLabel>
            <FormattedMessage
              id="tsvb.timeSeries.overrideIndexPatternLabel"
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
  onChange: PropTypes.func
};

export default TimeseriesConfig;
