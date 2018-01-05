import PropTypes from 'prop-types';
import React from 'react';
import AggSelect from './agg_select';
import FieldSelect from './field_select';
import AggRow from './agg_row';
import createChangeHandler from '../lib/create_change_handler';
import createSelectHandler from '../lib/create_select_handler';
import createTextHandler from '../lib/create_text_handler';
import { htmlIdGenerator } from '@elastic/eui';

export const PercentileRankAgg = props => {
  const { series, panel, fields } = props;
  const defaults = { value: '' };
  const model = { ...defaults, ...props.model };

  const handleChange = createChangeHandler(props.onChange, model);
  const handleSelectChange = createSelectHandler(handleChange);
  const handleTextChange = createTextHandler(handleChange);

  const indexPattern = series.override_index_pattern && series.series_index_pattern || panel.index_pattern;
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
        <label className="vis_editor__label" htmlFor={htmlId('field')}>Field</label>
        <FieldSelect
          id={htmlId('field')}
          fields={fields}
          type={model.type}
          restrict="numeric"
          indexPattern={indexPattern}
          value={model.field}
          onChange={handleSelectChange('field')}
        />
      </div>
      <div className="vis_editor__percentile_rank_value">
        <label className="vis_editor__label" htmlFor={htmlId('value')}>Value</label>
        <input
          id={htmlId('value')}
          className="vis_editor__input-grows"
          value={model.value}
          onChange={handleTextChange('value')}
        />
      </div>
    </AggRow>
  );
};

PercentileRankAgg.propTypes = {
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
