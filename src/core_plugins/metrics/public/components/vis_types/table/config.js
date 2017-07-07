import React, { Component, PropTypes } from 'react';
import DataFormatPicker from '../../data_format_picker';
import createSelectHandler from '../../lib/create_select_handler';
import createTextHandler from '../../lib/create_text_handler';

class TableSeriesConfig extends Component {
  render() {
    const defaults = { offset_time: '', value_template: '' };
    const model = { ...defaults, ...this.props.model };
    const handleSelectChange = createSelectHandler(this.props.onChange);
    const handleTextChange = createTextHandler(this.props.onChange);

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
            <div className="vis_editor__label">Offset series time by (1m, 1h, 1w, 1d)</div>
            <input
              className="vis_editor__input-grows"
              type="text"
              onChange={handleTextChange('offset_time')}
              value={model.offset_time}/>
          </div>
        </div>
      </div>
    );
  }

}

TableSeriesConfig.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func
};

export default TableSeriesConfig;


