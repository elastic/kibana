import React, { Component, PropTypes } from 'react';
import _ from 'lodash';
import uuid from 'uuid';
import AggRow from './agg_row';
import AggSelect from './agg_select';

import createChangeHandler from '../lib/create_change_handler';
import createSelectHandler from '../lib/create_select_handler';
import createTextHandler from '../lib/create_text_handler';
import Vars from './vars';

class MathAgg extends Component {

  componentWillMount() {
    if (!this.props.model.variables) {
      this.props.onChange(_.assign({}, this.props.model, {
        variables: [{ id: uuid.v1() }]
      }));
    }
  }

  render() {
    const { siblings } = this.props;

    const defaults = { script: '' };
    const model = { ...defaults, ...this.props.model };

    const handleChange = createChangeHandler(this.props.onChange, model);
    const handleSelectChange = createSelectHandler(handleChange);
    const handleTextChange = createTextHandler(handleChange);

    return (
      <AggRow
        disableDelete={this.props.disableDelete}
        model={this.props.model}
        onAdd={this.props.onAdd}
        onDelete={this.props.onDelete}
        siblings={this.props.siblings}
      >
        <div className="vis_editor__row_item">
          <div>
            <div className="vis_editor__label">Aggregation</div>
            <AggSelect
              siblings={this.props.siblings}
              value={model.type}
              onChange={handleSelectChange('type')}
            />
            <div className="vis_editor__variables">
              <div className="vis_editor__label">Variables</div>
              <Vars
                metrics={siblings}
                onChange={handleChange}
                name="variables"
                model={model}
                includeSiblings={true}
              />
            </div>
            <div className="vis_editor__row_item">
              <div className="vis_editor__label">
                Basic math (see <a href="http://mathjs.org/docs/expressions/syntax.html" target="_blank">MathJS</a>) - Variables are keys on the <code>params</code>
                object, i.e. <code>params.&lt;name&gt;</code> To access all the data use <code>all.&lt;name&gt;</code>,
                returns and array of arrays containing the integer timestamp and the value.
                <code>currentTimestamp</code> and <code>index</code> are also available.
              </div>
              <input
                className="vis_editor__input-grows-100"
                type="text"
                onChange={handleTextChange('script')}
                value={model.script}
              />
            </div>
          </div>
        </div>
      </AggRow>
    );
  }

}

MathAgg.propTypes = {
  disableDelete: PropTypes.bool,
  fields: PropTypes.object,
  model: PropTypes.object,
  onAdd: PropTypes.func,
  onChange: PropTypes.func,
  onDelete: PropTypes.func,
  panel: PropTypes.object,
  series: PropTypes.object,
  siblings: PropTypes.array,
};

export default MathAgg;
