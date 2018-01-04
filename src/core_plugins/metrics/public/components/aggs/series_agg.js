import PropTypes from 'prop-types';
import React from 'react';
import AggSelect from './agg_select';
import Select from 'react-select';
import AggRow from './agg_row';
import createChangeHandler from '../lib/create_change_handler';
import createSelectHandler from '../lib/create_select_handler';
import { htmlIdGenerator } from '@elastic/eui';

function SeriesAgg(props) {
  const { panel, model } = props;

  const handleChange = createChangeHandler(props.onChange, model);
  const handleSelectChange = createSelectHandler(handleChange);

  const htmlId = htmlIdGenerator();

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

  if (panel.type === 'table') {
    return (
      <AggRow
        disableDelete={props.disableDelete}
        model={props.model}
        onAdd={props.onAdd}
        onDelete={props.onDelete}
        siblings={props.siblings}
      >
        <div className="vis_editor__item">
          <div className="vis_editor__label">
            Series Agg is not compatible with the table visualization.
          </div>
        </div>
      </AggRow>
    );
  }

  return (
    <AggRow
      disableDelete={props.disableDelete}
      model={props.model}
      onAdd={props.onAdd}
      onDelete={props.onDelete}
      siblings={props.siblings}
    >
      <div className="vis_editor__item">
        <div className="vis_editor__label">Aggregation</div>
        <AggSelect
          panelType={panel.type}
          siblings={props.siblings}
          value={model.type}
          onChange={handleSelectChange('type')}
        />
      </div>
      <div className="vis_editor__item">
        <label className="vis_editor__label" htmlFor={htmlId('function')}>Function</label>
        <Select
          inputProps={{ id: htmlId('function') }}
          value={model.function}
          options={functionOptions}
          onChange={handleSelectChange('function')}
        />
      </div>
    </AggRow>
  );

}

SeriesAgg.propTypes = {
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

export default SeriesAgg;
