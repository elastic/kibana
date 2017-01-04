import React from 'react';
import Select from 'react-select';
import _ from 'lodash';
import FieldSelect from './aggs/field_select';
import MetricSelect from './aggs/metric_select';
import calculateLabel from './lib/calculate_label';
export default React.createClass({

  handleTextChange(name) {
    return (e) => {
      e.preventDefault();
      const part = {};
      part[name] = this.refs[name].value;
      this.props.onChange(part);
    };
  },

  handleSelectChange(name) {
    return (value) => {
      const part = {};
      part[name] = value && value.value || null;
      this.props.onChange(part);
    };
  },

  render() {
    const { model } = this.props;
    const modeOptions = [
      { label: 'Everything', value: 'everything' },
      { label: 'Filter', value: 'filter' },
      { label: 'Terms', value: 'terms' }
    ];
    const modeSelect = (
      <div className="vis_editor__split-selects">
        <Select
        clearable={false}
        value={ model.split_mode || 'everything' }
        onChange={this.handleSelectChange('split_mode')}
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
          onChange={this.handleTextChange('filter')}
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
              onChange={this.handleSelectChange('terms_field')}
              value={model.terms_field}
              fields={this.props.fields} />
          </div>
          <div className="vis_editor__label">Top</div>
          <input
            placeholder="Size..."
            type="number"
            defaultValue={model.terms_size || 10}
            className="vis_editor__split-term_count"
            onChange={this.handleTextChange('terms_size')}
            ref="terms_size"/>
          <div className="vis_editor__label">Order By</div>
          <div className="vis_editor__split-aggs">
            <MetricSelect
              metrics={metrics}
              clearable={false}
              additionalOptions={[defaultCount]}
              onChange={this.handleSelectChange('terms_order_by')}
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
});
