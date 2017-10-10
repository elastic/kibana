import PropTypes from 'prop-types';
import React from 'react';
import { Form } from '../../core';
import DataFormatPicker from '../../data_format_picker';
import createSelectHandler from '../../../lib/component_utils/create_select_handler';
import { IndexPattern } from '../../index_pattern';

const stackedOptions = [{ label: 'None', value: 'none' }, { label: 'Stacked', value: 'stacked' }, { label: 'Percent', value: 'percent' }];
const positionOptions = [{ label: 'Right', value: 'right' }, { label: 'Left', value: 'left' }];
const chartTypeOptions = [{ label: 'Bar', value: 'bar' }, { label: 'Line', value: 'line' }];
const splitColorOptions = [{ label: 'Gradient', value: 'gradient' }, { label: 'Rainbow', value: 'rainbow' }];
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

function TimeseriesConfig(props) {
  let { model = {} } = props;
  const { onChange = () => {} } = props;
  model = { ...defaults, ...model };

  const handleSelectChange = createSelectHandler(onChange);
  const disableSeperateYaxis = model.seperate_axis ? false : true;

  return (
    <div>
      <div className="vis_editor__series_config-container">
        <div className="vis_editor__series_config-row">
          <DataFormatPicker onChange={handleSelectChange('formatter')} value={model.formatter} />
          <Form.Text
            label={
              <span>
                Template (eg.<code>{'{{value}}/s'}</code>)
              </span>
            }
            onChange={onChange}
            name="value_template"
            value={model.value_template}
          />
        </div>
        <div className="vis_editor__series_config-row">
          <Form.Select
            label="Chart Type"
            onChange={onChange}
            clearable={false}
            options={chartTypeOptions}
            name="chart_type"
            value={model.chart_type}
          />
          <Form.Select
            label="Stacked"
            onChange={onChange}
            clearable={false}
            options={stackedOptions}
            name="stacked"
            value={model.stacked}
          />
          <Form.Stepper label="Fill Opacity" onChange={onChange} name="fill" step="0.1" max={1} min={0} value={model.fill} />
          <Form.Stepper label="Line Width" onChange={onChange} name="line_width" max={50} min={0} value={model.line_width} />
          {model.chart_type === 'line' && (
            <div>
              <Form.Stepper label="Point Size" onChange={onChange} name="point_size" max={100} min={0} value={model.point_size} />
              <Form.YesNo label="Steps" onChange={onChange} name="steps" max={100} min={0} value={model.steps} />
            </div>
          )}
        </div>
        <div className="vis_editor__series_config-row">
          <Form.Text label="Offset series time by (1m, 1h, 1d)" onChange={onChange} name="offset_time" value={model.offset_time} />
          <Form.YesNo label="Hide in Legend" onChange={onChange} name="hide_in_legend" value={model.hide_in_legend} />
          <Form.Select
            label="Split Color Theme"
            onChange={onChange}
            clearable={false}
            options={splitColorOptions}
            name="split_color_mode"
            value={model.split_color_mode}
          />
        </div>
        <div className="vis_editor__series_config-row">
          <Form.YesNo label="Separate Axis" onChange={onChange} name="seperate_axis" value={model.seperate_axis} />
          <Form.Text
            label="Axis Min"
            type="number"
            onChange={onChange}
            disabled={disableSeperateYaxis}
            name="axis_min"
            value={model.axis_min}
          />
          <Form.Text
            label="Axis Max"
            type="number"
            onChange={onChange}
            disabled={disableSeperateYaxis}
            name="axis_max"
            value={model.axis_max}
          />
          <Form.Select
            label="Axis Position"
            onChange={onChange}
            clearable={false}
            disabled={disableSeperateYaxis}
            options={positionOptions}
            name="axis_position"
            value={model.axis_position}
          />
        </div>
        <div className="vis_editor__series_config-row">
          <div className="vis_editor__label">Override Index Pattern</div>
          <Form.YesNo value={model.override_index_pattern} name="override_index_pattern" onChange={onChange} />
          <IndexPattern
            {...props}
            prefix="series_"
            className="vis_editor__row_item vis_editor__row"
            disabled={!model.override_index_pattern}
            with-interval={true}
          />
        </div>
      </div>
    </div>
  );
}

TimeseriesConfig.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func
};

export default TimeseriesConfig;
