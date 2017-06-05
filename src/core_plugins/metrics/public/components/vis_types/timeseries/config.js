import React, { PropTypes } from 'react';
import Select from 'react-select';
import DataFormatPicker from '../../data_format_picker';
import createSelectHandler from '../../lib/create_select_handler';
import YesNo from '../../yes_no';
import createTextHandler from '../../lib/create_text_handler';
import IndexPattern from '../../index_pattern';

function TimeseriesConfig(props) {
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

  const stackedOptions = [
    { label: 'None', value: 'none' },
    { label: 'Stacked', value: 'stacked' },
    { label: 'Percent', value: 'percent' }
  ];

  const positionOptions = [
    { label: 'Right', value: 'right' },
    { label: 'Left', value: 'left' }
  ];

  const chartTypeOptions = [
    { label: 'Bar', value: 'bar' },
    { label: 'Line', value: 'line' }
  ];

  const splitColorOptions = [
    { label: 'Gradient', value: 'gradient' },
    { label: 'Rainbow', value: 'rainbow' }
  ];

  let type;
  if (model.chart_type === 'line') {
    type = (
      <div className="vis_editor__series_config-row">
        <div className="vis_editor__label">Chart Type</div>
        <div className="vis_editor__item">
          <Select
            clearable={false}
            options={chartTypeOptions}
            value={model.chart_type}
            onChange={handleSelectChange('chart_type')}/>
        </div>
        <div className="vis_editor__label">Stacked</div>
        <div className="vis_editor__item">
          <Select
            clearable={false}
            options={stackedOptions}
            value={model.stacked}
            onChange={handleSelectChange('stacked')}/>
        </div>
        <div className="vis_editor__label">Fill (0 to 1)</div>
        <input
          className="vis_editor__input-grows"
          type="number"
          step="0.1"
          onChange={handleTextChange('fill')}
          value={model.fill}/>
        <div className="vis_editor__label">Line Width</div>
        <input
          className="vis_editor__input-grows"
          type="number"
          onChange={handleTextChange('line_width')}
          value={model.line_width}/>
        <div className="vis_editor__label">Point Size</div>
        <input
          className="vis_editor__input-grows"
          type="number"
          onChange={handleTextChange('point_size')}
          value={model.point_size}/>
        <div className="vis_editor__label">Steps</div>
        <YesNo
          value={model.steps}
          name="steps"
          onChange={props.onChange}/>
      </div>
    );
  }
  if (model.chart_type === 'bar') {
    type = (
      <div className="vis_editor__series_config-row">
        <div className="vis_editor__label">Chart Type</div>
        <div className="vis_editor__item">
          <Select
            clearable={false}
            options={chartTypeOptions}
            value={model.chart_type}
            onChange={handleSelectChange('chart_type')}/>
        </div>
        <div className="vis_editor__label">Stacked</div>
        <div className="vis_editor__item">
          <Select
            clearable={false}
            options={stackedOptions}
            value={model.stacked}
            onChange={handleSelectChange('stacked')}/>
        </div>
        <div className="vis_editor__label">Fill (0 to 1)</div>
        <input
          className="vis_editor__input-grows"
          type="number"
          step="0.5"
          onChange={handleTextChange('fill')}
          value={model.fill}/>
        <div className="vis_editor__label">Line Width</div>
        <input
          className="vis_editor__input-grows"
          type="number"
          onChange={handleTextChange('line_width')}
          value={model.line_width}/>
      </div>
    );
  }

  const disableSeperateYaxis = model.seperate_axis ? false : true;

  return (
    <div>
      <div className="vis_editor__series_config-container">
        <div className="vis_editor__series_config-row">
          <DataFormatPicker
            onChange={handleSelectChange('formatter')}
            value={model.formatter}/>
          <div className="vis_editor__label">Template (eg.<code>{'{{value}}/s'}</code>)</div>
          <input
            className="vis_editor__input-grows"
            onChange={handleTextChange('value_template')}
            value={model.value_template}/>
        </div>
        { type }
        <div className="vis_editor__series_config-row">
          <div className="vis_editor__label">Offset series time by (1m, 1h, 1w, 1d)</div>
          <input
            className="vis_editor__input-grows"
            type="text"
            onChange={handleTextChange('offset_time')}
            value={model.offset_time}/>
          <div className="vis_editor__label">Hide in Legend</div>
          <YesNo
            value={model.hide_in_legend}
            name="hide_in_legend"
            onChange={props.onChange}/>
          <div className="vis_editor__label">Split Color Theme</div>
          <div className="vis_editor__row_item">
            <Select
              clearable={false}
              options={splitColorOptions}
              value={model.split_color_mode}
              onChange={handleSelectChange('split_color_mode')}/>
          </div>
        </div>
        <div className="vis_editor__series_config-row">
          <div className="vis_editor__label">Separate Axis</div>
          <YesNo
            value={model.seperate_axis}
            name="seperate_axis"
            onChange={props.onChange}/>
          <div className="vis_editor__label">Axis Min</div>
          <input
            className="vis_editor__input-grows"
            type="number"
            disabled={disableSeperateYaxis}
            onChange={handleTextChange('axis_min')}
            value={model.axis_min}/>
          <div className="vis_editor__label">Axis Max</div>
          <input
            className="vis_editor__input-grows"
            type="number"
            disabled={disableSeperateYaxis}
            onChange={handleTextChange('axis_max')}
            value={model.axis_max}/>
          <div className="vis_editor__label">Axis Position</div>
          <div className="vis_editor__row_item">
            <Select
              clearable={false}
              disabled={disableSeperateYaxis}
              options={positionOptions}
              value={model.axis_position}
              onChange={handleSelectChange('axis_position')}/>
          </div>
        </div>
        <div className="vis_editor__series_config-row">
          <div className="vis_editor__label">Override Index Pattern</div>
          <YesNo
            value={model.override_index_pattern}
            name="override_index_pattern"
            onChange={props.onChange}/>
          <IndexPattern
            {...props}
            prefix="series_"
            className="vis_editor__row_item vis_editor__row"
            disabled={!model.override_index_pattern}
            with-interval={true} />
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
