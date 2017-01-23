import React from 'react';
import _ from 'lodash';
import AggSelect from './agg_select';
import Select from 'react-select';
import AggRow from './agg_row';
import createChangeHandler from '../lib/create_change_handler';
import createSelectHandler from '../lib/create_select_handler';
export default React.createClass({

  render() {
    const { model, panel, fields } = this.props;

    const handleChange = createChangeHandler(this.props.onChange, model);
    const handleSelectChange = createSelectHandler(handleChange);

    const functionOptions = [
      { label: 'Sum', value: 'sum' },
      { label: 'Max', value: 'max' },
      { label: 'Min', value: 'min' },
      { label: 'Avg', value: 'mean' },
      { label: 'Overall Sum', value: 'overall_sum' },
      { label: 'Overall Max', value: 'overall_max' },
      { label: 'Overall Min', value: 'overall_min' },
      { label: 'Overall Avg', value: 'overall_avg' },
      { label: 'Cumlative Sum', value: 'cumlative_sum' },
    ];

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
        <div className="vis_editor__item">
          <div className="vis_editor__label">Function</div>
          <Select
            value={model.function}
            options={functionOptions}
            onChange={handleSelectChange('function')}/>
        </div>
      </AggRow>
    );
  }
});

