import React, { Component, PropTypes } from 'react';
import Select from 'react-select';
import DataFormatPicker from './data_format_picker';
import createSelectHandler from './lib/create_select_handler';
import createTextHandler from './lib/create_text_handler';
import YesNo from './yes_no';
import IndexPattern from './index_pattern';

class SeriesConfig extends Component {
  render() {
    const { fields, model } = this.props;
    const handleSelectChange = createSelectHandler(this.props.onChange);
    const handleTextChange = createTextHandler(this.props.onChange, this.refs);

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
              ref="value_template"
              defaultValue={model.value_template}/>
            <div className="vis_editor__label">Offset series time by (1m, 1h, 1w, 1d)</div>
            <input
              className="vis_editor__input-grows"
              type="text"
              ref="offset_time"
              onChange={handleTextChange('offset_time')}
              defaultValue={model.offset_time}/>
          </div>
          <div className="vis_editor__series_config-row">
            <div className="vis_editor__label">Override Index Pattern</div>
            <YesNo
              value={model.override_index_pattern}
              name="override_index_pattern"
              onChange={this.props.onChange}/>
            <IndexPattern
              onChange={this.props.onChange}
              model={this.props.model}
              fields={this.props.fields}
              prefix="series_"
              className="vis_editor__row_item vis_editor__row"
              disabled={!model.override_index_pattern} />
          </div>
        </div>
      </div>
    );
  }

}

SeriesConfig.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func
};

export default SeriesConfig;

