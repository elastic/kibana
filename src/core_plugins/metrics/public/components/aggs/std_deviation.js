import React from 'react';
import _ from 'lodash';
import AggSelect from './agg_select';
import FieldSelect from './field_select';
import AggRow from './agg_row';
import Select from 'react-select';
import createChangeHandler from '../lib/create_change_handler';
import createSelectHandler from '../lib/create_select_handler';
import createTextHandler from '../lib/create_text_handler';

export default React.createClass({

  render() {
    const { model, panel, fields } = this.props;

    const modeOptions = [
      { label: 'Raw', value: 'raw' },
      { label: 'Upper Bound', value: 'upper' },
      { label: 'Lower Bound', value: 'lower' },
      { label: 'Bounds Band', value: 'band' }
    ];

    const handleChange = createChangeHandler(this.props.onChange, model);
    const handleSelectChange = createSelectHandler(handleChange);
    const handleTextChange = createTextHandler(handleChange, this.refs);

    const indexPattern = model.override_index_pattern && model.series_index_pattern || panel.index_pattern;

    return (
      <AggRow {...this.props}>
        <div className="vis_editor__row_item">
          <div className="vis_editor__label">Aggregation</div>
          <AggSelect
            siblings={this.props.siblings}
            panelType={panel.type}
            value={model.type}
            onChange={handleSelectChange('type')}/>
        </div>
        <div className="vis_editor__std_deviation-field">
          <div className="vis_editor__label">Field</div>
          <FieldSelect
            fields={fields}
            type={model.type}
            restrict="numeric"
            indexPattern={indexPattern}
            value={model.field}
            onChange={handleSelectChange('field')}/>
        </div>
        <div className="vis_editor__std_deviation-sigma_item">
          <div className="vis_editor__label">Sigma</div>
          <input
            className="vis_editor__std_deviation-sigma"
            ref="sigma"
            defaultValue={model.sigma}
            onChange={handleTextChange('sigma')}/>
        </div>
        <div className="vis_editor__row_item">
          <div className="vis_editor__label">Mode</div>
          <Select
            options={modeOptions}
            onChange={handleSelectChange('mode')}
            value={model.mode}/>
        </div>
      </AggRow>
    );
  }
});
