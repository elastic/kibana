import React from 'react';
import Select from 'react-select';
import DataFormatPicker from 'plugins/metrics/components/vis_editor/data_format_picker';
import createSelectHandler from 'plugins/metrics/lib/create_select_handler';
import createTextHandler from 'plugins/metrics/lib/create_text_handler';

export default React.createClass({
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
        </div>
      </div>
    );
  }
});



