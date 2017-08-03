import React, { PropTypes } from 'react';
import DataFormatPicker from './data_format_picker';
import createSelectHandler from './lib/create_select_handler';
import createTextHandler from './lib/create_text_handler';
import YesNo from './yes_no';
import { IndexPattern } from './index_pattern';

export const SeriesConfig = props => {
  const defaults = { offset_time: '', value_template: '' };
  const model = { ...defaults, ...props.model };
  const handleSelectChange = createSelectHandler(props.onChange);
  const handleTextChange = createTextHandler(props.onChange);

  return (
    <div>
      <div className="vis_editor__series_config-container">
        <div className="vis_editor__series_config-row">
          <DataFormatPicker
            onChange={handleSelectChange('formatter')}
            value={model.formatter}
          />
          <div className="vis_editor__label">Template (eg.<code>{'{{value}}/s'}</code>)</div>
          <input
            className="vis_editor__input-grows"
            onChange={handleTextChange('value_template')}
            value={model.value_template}
          />
          <div className="vis_editor__label">Offset series time by (1m, 1h, 1w, 1d)</div>
          <input
            className="vis_editor__input-grows"
            type="text"
            onChange={handleTextChange('offset_time')}
            value={model.offset_time}
          />
        </div>
        <div className="vis_editor__series_config-row">
          <div className="vis_editor__label">Override Index Pattern</div>
          <YesNo
            value={model.override_index_pattern}
            name="override_index_pattern"
            onChange={props.onChange}
          />
          <IndexPattern
            onChange={props.onChange}
            model={props.model}
            fields={props.fields}
            prefix="series_"
            className="vis_editor__row_item vis_editor__row"
            disabled={!model.override_index_pattern}
          />
        </div>
      </div>
    </div>
  );
};

SeriesConfig.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func
};

