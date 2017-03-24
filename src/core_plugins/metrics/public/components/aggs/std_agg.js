import React, { PropTypes } from 'react';
import AggSelect from './agg_select';
import FieldSelect from './field_select';
import AggRow from './agg_row';
import createChangeHandler from '../lib/create_change_handler';
import createSelectHandler from '../lib/create_select_handler';

function StandardAgg(props) {
  const { model, panel, series, fields } = props;

  const handleChange = createChangeHandler(props.onChange, model);
  const handleSelectChange = createSelectHandler(handleChange);
  let restrict = 'numeric';
  if (model.type === 'cardinality') {
    restrict = 'string';
  }

  const indexPattern = series.override_index_pattern && series.series_index_pattern || panel.index_pattern;

  return (
    <AggRow
      disableDelete={props.disableDelete}
      model={props.model}
      onAdd={props.onAdd}
      onDelete={props.onDelete}
      siblings={props.siblings}>
      <div className="vis_editor__item">
        <div className="vis_editor__label">Aggregation</div>
        <AggSelect
          siblings={props.siblings}
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
      </div>) : null }
    </AggRow>
  );

}

StandardAgg.propTypes = {
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

export default StandardAgg;
