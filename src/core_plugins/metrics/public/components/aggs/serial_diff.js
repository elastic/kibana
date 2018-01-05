import PropTypes from 'prop-types';
import React from 'react';
import AggSelect from './agg_select';
import MetricSelect from './metric_select';
import AggRow from './agg_row';
import createChangeHandler from '../lib/create_change_handler';
import createSelectHandler from '../lib/create_select_handler';
import createNumberHandler from '../lib/create_number_handler';
import { htmlIdGenerator } from '@elastic/eui';

export const SerialDiffAgg = props => {
  const { siblings } = props;
  const defaults = { lag: '' };
  const model = { ...defaults, ...props.model };

  const handleChange = createChangeHandler(props.onChange, model);
  const handleSelectChange = createSelectHandler(handleChange);
  const handleNumberChange = createNumberHandler(handleChange);

  const htmlId = htmlIdGenerator();

  return (
    <AggRow
      disableDelete={props.disableDelete}
      model={props.model}
      onAdd={props.onAdd}
      onDelete={props.onDelete}
      siblings={props.siblings}
    >
      <div className="vis_editor__row_item">
        <div className="vis_editor__label">Aggregation</div>
        <AggSelect
          panelType={props.panel.type}
          siblings={props.siblings}
          value={model.type}
          onChange={handleSelectChange('type')}
        />
      </div>
      <div className="vis_editor__row_item">
        <div className="vis_editor__label">Metric</div>
        <MetricSelect
          onChange={handleSelectChange('field')}
          metrics={siblings}
          metric={model}
          value={model.field}
        />
      </div>
      <div>
        <label className="vis_editor__label" htmlFor={htmlId('lag')}>Lag</label>
        <input
          id={htmlId('lag')}
          className="vis_editor__input"
          onChange={handleNumberChange('lag')}
          value={model.lag}
          type="text"
        />
      </div>
    </AggRow>
  );
};

SerialDiffAgg.propTypes = {
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
