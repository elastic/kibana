import PropTypes from 'prop-types';
import React from 'react';
import GroupBySelect from './group_by_select';
import createTextHandler from '../lib/create_text_handler';
import createSelectHandler from '../lib/create_select_handler';
import FieldSelect from '../aggs/field_select';
import MetricSelect from '../aggs/metric_select';
import Select from 'react-select';

export const SplitByTerms = props => {
  const handleTextChange = createTextHandler(props.onChange);
  const handleSelectChange = createSelectHandler(props.onChange);
  const { indexPattern } = props;
  const defaults = { terms_direction: 'desc', terms_size: 10, terms_order_by: '_count' };
  const model = { ...defaults, ...props.model };
  const { metrics } = model;
  const defaultCount = { value: '_count', label: 'Doc Count (default)' };
  const terms = { value: '_term', label: 'Terms' };

  const dirOptions = [
    { value: 'desc', label: 'Descending' },
    { value: 'asc', label: 'Ascending' },
  ];

  return (
    <div className="vis_editor__split-container">
      <div className="vis_editor__label">Group By</div>
      <div className="vis_editor__split-selects">
        <GroupBySelect
          value={model.split_mode}
          onChange={handleSelectChange('split_mode')}
        />
      </div>
      <div className="vis_editor__label">By</div>
      <div className="vis_editor__item">
        <FieldSelect
          indexPattern={indexPattern}
          onChange={handleSelectChange('terms_field')}
          value={model.terms_field}
          fields={props.fields}
        />
      </div>
      <div className="vis_editor__label">Top</div>
      <input
        placeholder="Size..."
        type="number"
        value={model.terms_size}
        className="vis_editor__split-term_count"
        onChange={handleTextChange('terms_size')}
      />
      <div className="vis_editor__label">Order By</div>
      <div className="vis_editor__split-aggs">
        <MetricSelect
          metrics={metrics}
          clearable={false}
          additionalOptions={[defaultCount, terms]}
          onChange={handleSelectChange('terms_order_by')}
          restrict="basic"
          value={model.terms_order_by}
        />
      </div>
      <div className="vis_editor__label">Direction</div>
      <div className="vis_editor__split-aggs">
        <Select
          options={dirOptions}
          clearable={false}
          value={model.terms_direction}
          onChange={handleSelectChange('terms_direction')}
        />
      </div>
    </div>
  );
};

SplitByTerms.propTypes = {
  model: PropTypes.object,
  onChange: PropTypes.func,
  indexPattern: PropTypes.string,
  fields: PropTypes.object
};
