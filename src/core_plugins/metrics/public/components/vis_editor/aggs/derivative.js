import React from 'react';
import _ from 'lodash';
import AggSelect from './agg_select';
import MetricSelect from './metric_select';
import AggRow from './agg_row';
import createChangeHandler from '../lib/create_change_handler';
import createSelectHandler from '../../../lib/create_select_handler';
import createTextHandler from '../../../lib/create_text_handler';
export default React.createClass({

  render() {
    const { model, siblings, panelType } = this.props;

    const handleChange = createChangeHandler(this.props.onChange, model);
    const handleSelectChange = createSelectHandler(handleChange);
    const handleTextChange = createTextHandler(handleChange, this.refs);

    return (
      <AggRow {...this.props}>
        <div className="vis_editor__row_item">
          <div className="vis_editor__label">Aggregation</div>
          <AggSelect
            siblings={this.props.siblings}
            panelType={panelType}
            value={model.type}
            onChange={handleSelectChange('type')}/>
        </div>
        <div className="vis_editor__row_item">
          <div className="vis_editor__label">Metric</div>
          <MetricSelect
            onChange={handleSelectChange('field')}
            metrics={siblings}
            metric={model}
            value={model.field}/>
        </div>
        <div>
          <div className="vis_editor__label">Units (1s, 1m, etc)</div>
          <input
            className="vis_editor__input"
            ref="unit"
            onChange={handleTextChange('unit')}
            defaultValue={model.unit}
            type="text"/>
        </div>
      </AggRow>
    );
  }
});

