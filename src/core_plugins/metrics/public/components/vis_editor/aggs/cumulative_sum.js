import React from 'react';
import AggRow from './agg_row';
import AggSelect from './agg_select';
import MetricSelect from './metric_select';
import createChangeHandler from '../lib/create_change_handler';
import createSelectHandler from '../../../lib/create_select_handler';
export default React.createClass({
  render() {
    const { model, panelType, siblings } = this.props;
    const handleChange = createChangeHandler(this.props.onChange, model);
    const handleSelectChange = createSelectHandler(handleChange);
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
      </AggRow>
    );
  }
});
