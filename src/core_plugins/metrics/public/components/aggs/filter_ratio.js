import PropTypes from 'prop-types';
import React from 'react';
import AggSelect from './agg_select';
import FieldSelect from './field_select';
import AggRow from './agg_row';
import createChangeHandler from '../lib/create_change_handler';
import createSelectHandler from '../lib/create_select_handler';
import createTextHandler from '../lib/create_text_handler';
import { htmlIdGenerator } from '@elastic/eui';

export const FilterRatioAgg = props => {
  const {
    series,
    fields,
    panel
  } = props;

  const handleChange = createChangeHandler(props.onChange, props.model);
  const handleSelectChange = createSelectHandler(handleChange);
  const handleTextChange = createTextHandler(handleChange);
  const indexPattern = series.override_index_pattern && series.series_index_pattern || panel.index_pattern;

  const defaults = {
    numerator: '*',
    denominator: '*',
    metric_agg: 'count'
  };

  const model = { ...defaults, ...props.model };
  const htmlId = htmlIdGenerator();

  const restrictMode = model.metric_agg === 'cardinality' ? 'none' : 'numeric';

  return (
    <AggRow
      disableDelete={props.disableDelete}
      model={props.model}
      onAdd={props.onAdd}
      onDelete={props.onDelete}
      siblings={props.siblings}
    >
      <div style={{ flex: '1 0 auto' }}>
        <div style={{ flex: '1 0 auto', display: 'flex' }}>
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
            <label className="vis_editor__label" htmlFor={htmlId('numerator')}>
              Numerator
            </label>
            <input
              id={htmlId('numerator')}
              className="vis_editor__input-grows-100"
              onChange={handleTextChange('numerator')}
              value={model.numerator}
              type="text"
            />
          </div>
          <div className="vis_editor__row_item">
            <label className="vis_editor__label" htmlFor={htmlId('denominator')}>
              Denominator
            </label>
            <input
              id={htmlId('denominator')}
              className="vis_editor__input-grows-100"
              onChange={handleTextChange('denominator')}
              value={model.denominator}
              type="text"
            />
          </div>
        </div>
        <div style={{ flex: '1 0 auto', display: 'flex', marginTop: '10px' }}>
          <div className="vis_editor__row_item">
            <div className="vis_editor__label">Metric Aggregation</div>
            <AggSelect
              siblings={props.siblings}
              panelType="metrics"
              value={model.metric_agg}
              onChange={handleSelectChange('metric_agg')}
            />
          </div>
          { model.metric_agg !== 'count' ? (
            <div className="vis_editor__row_item">
              <label className="vis_editor__label" htmlFor={htmlId('aggField')}>
                Field
              </label>
              <FieldSelect
                id={htmlId('aggField')}
                fields={fields}
                type={model.metric_agg}
                restrict={restrictMode}
                indexPattern={indexPattern}
                value={model.field}
                onChange={handleSelectChange('field')}
              />
            </div>) : null }
        </div>
      </div>
    </AggRow>
  );
};

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
