import React from 'react';
import _ from 'lodash';
import AggSelect from './agg_select';
import FieldSelect from './field_select';
import AggRow from './agg_row';
import createChangeHandler from '../lib/create_change_handler';
import createSelectHandler from '../lib/create_select_handler';
export default React.createClass({

  render() {
    const { model, panel, fields } = this.props;

    const handleChange = createChangeHandler(this.props.onChange, model);
    const handleSelectChange = createSelectHandler(handleChange);
    let restrict = 'numeric';
    if (model.type === 'cardinality') {
      restrict = 'string';
    }

    const indexPattern = model.override_index_pattern || model.series_index_pattern || panel.index_pattern;

    return (
      <AggRow {...this.props}>
        <div className="vis_editor__item">
          <div className="vis_editor__label">Aggregation</div>
          <AggSelect
            siblings={this.props.siblings}
            panelType={panel.type}
            value={model.type}
            onChange={handleSelectChange('type')}/>
        </div>
        { model.type !== 'count' ? (<div className="vis_editor__item">
          <div className="vis_editor__label">Field</div>
          <FieldSelect
            fields={fields}
            type={model.type}
            restrict={restrict}
            indexPattern={indexPattern}
            value={model.field}
            onChange={handleSelectChange('field')}/>
        </div>) : (<div style={{ display: 'none' }}/>) }
      </AggRow>
    );
  }
});
