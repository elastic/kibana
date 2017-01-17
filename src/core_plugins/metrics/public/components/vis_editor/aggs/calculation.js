import React from 'react';
import _ from 'lodash';
import uuid from 'node-uuid';
import AggRow from './agg_row';
import AggSelect from './agg_select';
import Select from 'react-select';

import createChangeHandler from '../lib/create_change_handler';
import createSelectHandler from '../../../lib/create_select_handler';
import createTextHandler from '../../../lib/create_text_handler';
import Vars from './vars';

export default React.createClass({

  componentWillMount() {
    if (!this.props.model.variables) {
      this.props.onChange(_.assign({}, this.props.model, {
        variables: [{ id: uuid.v1() }]
      }));
    }
  },

  render() {
    const { model, panel, siblings } = this.props;
    const handleChange = createChangeHandler(this.props.onChange, model);
    const handleSelectChange = createSelectHandler(handleChange);
    const handleTextChange = createTextHandler(handleChange, this.refs);

    return (
      <AggRow {...this.props}>
        <div className="vis_editor__row_item">
          <div>
            <div className="vis_editor__label">Aggregation</div>
            <AggSelect
              siblings={this.props.siblings}
              panelType={panel.type}
              value={model.type}
              onChange={handleSelectChange('type')}/>
            <div className="vis_editor__row_item" style={{ margin: '10px 0' }}>
              <div className="vis_editor__label">Variables</div>
              <Vars
                metrics={siblings}
                onChange={handleChange}
                name="variables"
                model={model}/>
            </div>
            <div className="vis_editor__row_item">
              <div className="vis_editor__label">Script (Painless)</div>
              <input
                style={{ width: '100%' }}
                className="vis_editor__input-grows"
                type="text"
                ref="script"
                onChange={handleTextChange('script')}
                defaultValue={model.script}/>
            </div>
          </div>
        </div>
      </AggRow>
    );
  }

});
