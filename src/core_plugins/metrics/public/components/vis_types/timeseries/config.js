import PropTypes from 'prop-types';
import React from 'react';
import Select from 'react-select';
import DataFormatPicker from '../../data_format_picker';
import createSelectHandler from '../../lib/create_select_handler';
import YesNo from '../../yes_no';
import createTextHandler from '../../lib/create_text_handler';
import { IndexPattern } from '../../index_pattern';
import { htmlIdGenerator } from '@elastic/eui';

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
  const htmlId = htmlIdGenerator();

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
        <label className="vis_editor__label" htmlFor={htmlId('chartType')}>
          Chart Type
        </label>
        <div className="vis_editor__item">
          <Select
            inputProps={{ id: htmlId('chartType') }}
            clearable={false}
            options={chartTypeOptions}
            value={model.chart_type}
            onChange={handleSelectChange('chart_type')}
          />
        </div>
        <label className="vis_editor__label" htmlFor={htmlId('stacked')}>
          Stacked
        </label>
        <div className="vis_editor__item">
          <Select
            inputProps={{ id: htmlId('stacked') }}
            clearable={false}
            options={stackedOptions}
            value={model.stacked}
            onChange={handleSelectChange('stacked')}
          />
        </div>
        <label className="vis_editor__label" htmlFor={htmlId('fill')}>
          Fill (0 to 1)
        </label>
        <input
          id={htmlId('fill')}
          className="vis_editor__input-grows"
          type="number"
          step="0.1"
          onChange={handleTextChange('fill')}
          value={model.fill}
        />
        <label className="vis_editor__label" htmlFor={htmlId('lineWidth')}>
          Line Width
        </label>
        <input
          id={htmlId('lineWidth')}
          className="vis_editor__input-grows"
          type="number"
          onChange={handleTextChange('line_width')}
          value={model.line_width}
        />
        <label className="vis_editor__label" htmlFor={htmlId('pointSize')}>
          Point Size
        </label>
        <input
          id={htmlId('pointSize')}
          className="vis_editor__input-grows"
          type="number"
          onChange={handleTextChange('point_size')}
          value={model.point_size}
        />
        <div className="vis_editor__label">Steps</div>
        <YesNo
          value={model.steps}
          name="steps"
          onChange={props.onChange}
        />
      </div>
    );
  }
  if (model.chart_type === 'bar') {
    type = (
      <div className="vis_editor__series_config-row">
        <label className="vis_editor__label" htmlFor={htmlId('chartType')}>
          Chart Type
        </label>
        <div className="vis_editor__item">
          <Select
            inputProps={{ id: htmlId('chartType') }}
            clearable={false}
            options={chartTypeOptions}
            value={model.chart_type}
            onChange={handleSelectChange('chart_type')}
          />
        </div>
        <label className="vis_editor__label" htmlFor={htmlId('stacked')}>
          Stacked
        </label>
        <div className="vis_editor__item">
          <Select
            inputProps={{ id: htmlId('stacked') }}
            clearable={false}
            options={stackedOptions}
            value={model.stacked}
            onChange={handleSelectChange('stacked')}
          />
        </div>
        <label className="vis_editor__label" htmlFor={htmlId('fill')}>
          Fill (0 to 1)
        </label>
        <input
          id={htmlId('fill')}
          className="vis_editor__input-grows"
          type="number"
          step="0.5"
          onChange={handleTextChange('fill')}
          value={model.fill}
        />
        <label className="vis_editor__label" htmlFor={htmlId('lineWidth')}>
          Line Width
        </label>
        <input
          id={htmlId('lineWidth')}
          className="vis_editor__input-grows"
          type="number"
          onChange={handleTextChange('line_width')}
          value={model.line_width}
        />
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
            value={model.formatter}
          />
          <label className="vis_editor__label" htmlFor={htmlId('template')}>
            Template (eg.<code>{'{{value}}/s'}</code>)
          </label>
          <input
            id={htmlId('template')}
            className="vis_editor__input-grows"
            onChange={handleTextChange('value_template')}
            value={model.value_template}
          />
        </div>
        { type }
        <div className="vis_editor__series_config-row">
          <label className="vis_editor__label" htmlFor={htmlId('offset')}>
            Offset series time by (1m, 1h, 1w, 1d)
          </label>
          <input
            id={htmlId('offset')}
            data-test-subj="offsetTimeSeries"
            className="vis_editor__input-grows"
            type="text"
            onChange={handleTextChange('offset_time')}
            value={model.offset_time}
          />
          <div className="vis_editor__label">Hide in Legend</div>
          <YesNo
            value={model.hide_in_legend}
            name="hide_in_legend"
            onChange={props.onChange}
          />
          <label className="vis_editor__label" htmlFor={htmlId('splitColor')}>
            Split Color Theme
          </label>
          <div className="vis_editor__row_item">
            <Select
              inputProps={{ id: htmlId('splitColor') }}
              clearable={false}
              options={splitColorOptions}
              value={model.split_color_mode}
              onChange={handleSelectChange('split_color_mode')}
            />
          </div>
        </div>
        <div className="vis_editor__series_config-row">
          <div className="vis_editor__label">Separate Axis</div>
          <YesNo
            value={model.seperate_axis}
            name="seperate_axis"
            onChange={props.onChange}
          />
          <label className="vis_editor__label" htmlFor={htmlId('axisMin')}>
            Axis Min
          </label>
          <input
            id={htmlId('axisMin')}
            className="vis_editor__input-grows"
            type="number"
            disabled={disableSeperateYaxis}
            onChange={handleTextChange('axis_min')}
            value={model.axis_min}
          />
          <label className="vis_editor__label" htmlFor={htmlId('axisMax')}>
            Axis Max
          </label>
          <input
            id={htmlId('axisMax')}
            className="vis_editor__input-grows"
            type="number"
            disabled={disableSeperateYaxis}
            onChange={handleTextChange('axis_max')}
            value={model.axis_max}
          />
          <label className="vis_editor__label" htmlFor={htmlId('axisPos')}>
            Axis Position
          </label>
          <div className="vis_editor__row_item">
            <Select
              inputProps={{ id: htmlId('axisPos') }}
              clearable={false}
              disabled={disableSeperateYaxis}
              options={positionOptions}
              value={model.axis_position}
              onChange={handleSelectChange('axis_position')}
            />
          </div>
        </div>
        <div className="vis_editor__series_config-row">
          <div className="vis_editor__label">Override Index Pattern</div>
          <YesNo
            value={model.override_index_pattern}
            name="override_index_pattern"
            onChange={props.onChange}
          />
          <IndexPattern
            {...props}
            prefix="series_"
            className="vis_editor__row_item vis_editor__row"
            disabled={!model.override_index_pattern}
            with-interval={true}
          />
        </div>
        <div className="vis_editor__series_config-row">
          <label className="vis_editor__label" htmlFor={htmlId('series_filter')}>
            Filter
          </label>
          <input
            id={htmlId('series_filter')}
            className="vis_editor__input-grows"
            type="text"
            onChange={handleTextChange('filter')}
            value={model.filter}
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
