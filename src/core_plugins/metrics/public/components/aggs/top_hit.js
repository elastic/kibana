import React from 'react';
import AggRow from './agg_row';
import AggSelect from './agg_select';
import FieldSelect from './field_select';
import Select from 'react-select';
import createChangeHandler from '../lib/create_change_handler';
import createSelectHandler from '../lib/create_select_handler';
import createTextHandler from '../lib/create_text_handler';
import { htmlIdGenerator } from '@elastic/eui';

export const TopHitAgg = props => {
  const { fields, series, panel } = props;
  const defaults = {
    agg_with: 'avg',
    size: 1,
    order: 'desc',
  };
  const model = { ...defaults, ...props.model };
  const indexPattern =
    (series.override_index_pattern && series.series_index_pattern) ||
    panel.index_pattern;

  const handleChange = createChangeHandler(props.onChange, model);
  const handleSelectChange = createSelectHandler(handleChange);
  const handleTextChange = createTextHandler(handleChange);

  const aggWithOptions = [
    { label: 'Avg', value: 'avg' },
    { label: 'Max', value: 'max' },
    { label: 'Min', value: 'min' },
    { label: 'Sum', value: 'sum' },
  ];

  const orderOptions = [
    { label: 'Asc', value: 'asc' },
    { label: 'Desc', value: 'desc' },
  ];

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
        <div className="vis_editor__agg_row-item">
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
            <label className="vis_editor__label" htmlFor={htmlId('field')}>
              Field
            </label>
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
        </div>
        <div className="vis_editor__agg_row-item">
          <div className="vis_editor__row_item">
            <label className="vis_editor__label" htmlFor={htmlId('size')}>
              Size
            </label>
            <input
              id={htmlId('size')}
              className="vis_editor__input-grows-100"
              value={model.size}
              onChange={handleTextChange('size')}
            />
          </div>
          <div className="vis_editor__row_item">
            <label className="vis_editor__label" htmlFor={htmlId('agg_with')}>
              Aggregate with
            </label>
            <Select
              inputProps={{ id: htmlId('agg_with') }}
              clearable={false}
              placeholder="Select..."
              onChange={handleSelectChange('agg_with')}
              value={model.agg_with}
              options={aggWithOptions}
            />
          </div>
          <div className="vis_editor__row_item">
            <label className="vis_editor__label" htmlFor={htmlId('order_by')}>
              Order by
            </label>
            <FieldSelect
              id={htmlId('order_by')}
              restrict="date"
              value={model.order_by}
              onChange={handleSelectChange('order_by')}
              indexPattern={indexPattern}
              fields={fields}
            />
          </div>
          <div className="vis_editor__row_item">
            <label className="vis_editor__label" htmlFor={htmlId('order')}>
              Order
            </label>
            <Select
              inputProps={{ id: htmlId('order') }}
              clearable={false}
              placeholder="Select..."
              onChange={handleSelectChange('order')}
              value={model.order}
              options={orderOptions}
            />
          </div>
        </div>
      </div>
    </AggRow>
  );
};
