import React, { Component, PropTypes } from 'react';
import _ from 'lodash';
import AggSelect from './agg_select';
import MetricSelect from './metric_select';
import AggRow from './agg_row';
import createChangeHandler from '../lib/create_change_handler';
import createSelectHandler from '../lib/create_select_handler';
import createTextHandler from '../lib/create_text_handler';

class FilterRatioAgg extends Component {

  render() {
    const { siblings, panel } = this.props;

    const handleChange = createChangeHandler(this.props.onChange, this.props.model);
    const handleSelectChange = createSelectHandler(handleChange);
    const handleTextChange = createTextHandler(handleChange);

    const defaults = {
      numerator: '*',
      denominator: '*'
    };

    const model = { ...defaults, ...this.props.model };

    return (
      <AggRow
        disableDelete={this.props.disableDelete}
        model={this.props.model}
        onAdd={this.props.onAdd}
        onDelete={this.props.onDelete}
        siblings={this.props.siblings}>
        <div className="vis_editor__row_item">
          <div className="vis_editor__label">Aggregation</div>
          <AggSelect
            siblings={this.props.siblings}
            panelType={panel.type}
            value={model.type}
            onChange={handleSelectChange('type')}/>
        </div>
        <div className="vis_editor__row_item">
          <div className="vis_editor__label">Numerator</div>
          <input
            className="vis_editor__input-grows-100"
            onChange={handleTextChange('numerator')}
            value={model.numerator}
            type="text"/>
        </div>
        <div className="vis_editor__row_item">
          <div className="vis_editor__label">Denominator</div>
          <input
            className="vis_editor__input-grows-100"
            onChange={handleTextChange('denominator')}
            value={model.denominator}
            type="text"/>
        </div>
      </AggRow>
    );
  }

}

FilterRatioAgg.propTypes = {
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

export default FilterRatioAgg;
