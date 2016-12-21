import React from 'react';
import _ from 'lodash';
import FieldSelect from './aggs/field_select';
import createSelectHandler from '../../lib/create_select_handler';
import createTextHandler from '../../lib/create_text_handler';
export default React.createClass({

  render() {
    const { model, fields } = this.props;
    const handleSelectChange = createSelectHandler(this.props.onChange);
    const handleTextChange = createTextHandler(this.props.onChange, this.refs);
    return (
      <div className="vis_editor__row">
        <div className="vis_editor__label">Index Pattern</div>
        <input
          className="vis_editor__input"
          ref="index_pattern"
          onChange={handleTextChange('index_pattern', '*')}
          defaultValue={model.index_pattern || '*'}/>
        <div className="vis_editor__label">Time Field</div>
        <div className="vis_editor__index_pattern-fields">
          <FieldSelect
            restrict="date"
            value={model.time_field}
            onChange={handleSelectChange('time_field')}
            fields={fields}/>
        </div>
        <div className="vis_editor__label">Interval (auto, 1m, 1d, 1w, 1y)</div>
        <input
          className="vis_editor__input"
          ref="interval"
          onChange={handleTextChange('interval', 'auto')}
          defaultValue={model.interval || 'auto'}/>
      </div>
    );
  }

});

