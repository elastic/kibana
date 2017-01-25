import React, { Component, PropTypes } from 'react';
import Select from 'react-select';
import _ from 'lodash';
import FieldSelect from './aggs/field_select';
import MetricSelect from './aggs/metric_select';
import calculateLabel from './lib/calculate_label';
import createTextHandler from './lib/create_text_handler';
import createSelectHandler from './lib/create_select_handler';

class Split extends Component {
  render() {
    const handleTextChange = createTextHandler(this.props.onChange, this.refs);
    const handleSelectChange = createSelectHandler(this.props.onChange);
    const { model, panel } = this.props;
    const modeOptions = [
      { label: 'Everything', value: 'everything' },
      { label: 'Filter', value: 'filter' },
      { label: 'Terms', value: 'terms' }
    ];
    const indexPattern = model.override_index_pattern && model.series_index_pattern || panel.index_pattern;
    const modeSelect = (
      <div className="vis_editor__split-selects">
        <Select
          clearable={false}
          value={ model.split_mode || 'everything' }
          onChange={handleSelectChange('split_mode')}
          options={ modeOptions }/>
      </div>
    );
    if (model.split_mode === 'filter') {
      return (
        <div className="vis_editor__split-container">
          <div className="vis_editor__label">Group By</div>
          {modeSelect}
          <div className="vis_editor__label">Query String</div>
          <input
            className="vis_editor__split-filter"
            defaultValue={model.filter}
            onChange={handleTextChange('filter')}
            ref="filter"/>
        </div>
      );
    }
    if (model.split_mode === 'terms') {
      const { metrics } = model;
      const defaultCount = { value: '_count', label: 'Doc Count (default)' };
      return (
        <div className="vis_editor__split-container">
          <div className="vis_editor__label">Group By</div>
          {modeSelect}
          <div className="vis_editor__label">By</div>
          <div className="vis_editor__item">
            <FieldSelect
              restrict="string"
              IndexPattern={indexPattern}
              onChange={handleSelectChange('terms_field')}
              value={model.terms_field}
              fields={this.props.fields} />
          </div>
          <div className="vis_editor__label">Top</div>
          <input
            placeholder="Size..."
            type="number"
            defaultValue={model.terms_size || 10}
            className="vis_editor__split-term_count"
            onChange={handleTextChange('terms_size')}
            ref="terms_size"/>
          <div className="vis_editor__label">Order By</div>
          <div className="vis_editor__split-aggs">
            <MetricSelect
              metrics={metrics}
              clearable={false}
              additionalOptions={[defaultCount]}
              onChange={handleSelectChange('terms_order_by')}
              restrict="basic"
              value={model.terms_order_by || '_count'}/>
          </div>
        </div>
      );
    }
    return (<div className="vis_editor__split-container">
      <div className="vis_editor__label">Group By</div>
      {modeSelect}
    </div>);
  }

}

Split.propTypes = {
  fields   : PropTypes.object,
  model    : PropTypes.object,
  onChange : PropTypes.func,
  panel    : PropTypes.object
};

export default Split;
