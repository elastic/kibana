import PropTypes from 'prop-types';
import React from 'react';
import AggSelect from './agg_select';
import FieldSelect from './field_select';
import AggRow from './agg_row';
import Select from 'react-select';
import createChangeHandler from '../lib/create_change_handler';
import createSelectHandler from '../lib/create_select_handler';
import createTextHandler from '../lib/create_text_handler';
import { htmlIdGenerator } from '@elastic/eui';

export const StandardDeviationAgg = props => {
  const { series, panel, fields } = props;
  const defaults = { sigma: '' };
  const model = { ...defaults, ...props.model };

  const modeOptions = [
    { label: 'Raw', value: 'raw' },
    { label: 'Upper Bound', value: 'upper' },
    { label: 'Lower Bound', value: 'lower' },
  ];

  if (panel.type !== 'table') {
    modeOptions.push({ label: 'Bounds Band', value: 'band' });
  }

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
      <div className="vis_editor__std_deviation-field">
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
      <div className="vis_editor__std_deviation-sigma_item">
        <label className="vis_editor__label" htmlFor={htmlId('sigma')}>Sigma</label>
        <input
          id={htmlId('sigma')}
          className="vis_editor__std_deviation-sigma"
          value={model.sigma}
          onChange={handleTextChange('sigma')}
        />
      </div>
      <div className="vis_editor__row_item">
        <label className="vis_editor__label" htmlFor={htmlId('mode')}>Mode</label>
        <Select
          inputProps={{ id: htmlId('mode') }}
          options={modeOptions}
          onChange={handleSelectChange('mode')}
          value={model.mode}
        />
      </div>
    </AggRow>
  );
};

StandardDeviationAgg.propTypes = {
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
