import React, { Component } from 'react';
import PropTypes from 'prop-types';
import uuid from 'uuid';
import DataFormatPicker from '../../data_format_picker';
import createSelectHandler from '../../lib/create_select_handler';
import createTextHandler from '../../lib/create_text_handler';
import FieldSelect from '../../aggs/field_select';
import Select from 'react-select';
import YesNo from '../../yes_no';
import ColorRules from '../../color_rules';
import { htmlIdGenerator } from '@elastic/eui';

class TableSeriesConfig extends Component {

  componentWillMount() {
    const { model } = this.props;
    if (!model.color_rules || (model.color_rules && model.color_rules.length === 0)) {
      this.props.onChange({
        color_rules: [{ id: uuid.v1() }]
      });
    }
  }

  render() {
    const defaults = { offset_time: '', value_template: '' };
    const model = { ...defaults, ...this.props.model };
    const handleSelectChange = createSelectHandler(this.props.onChange);
    const handleTextChange = createTextHandler(this.props.onChange);
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

    return (
      <div>
        <div className="vis_editor__series_config-container">
          <div className="vis_editor__series_config-row">
            <DataFormatPicker
              onChange={handleSelectChange('formatter')}
              value={model.formatter}
            />
            <label className="vis_editor__label" htmlFor={htmlId('valueTemplateInput')}>Template (eg.<code>{'{{value}}/s'}</code>)</label>
            <input
              id={htmlId('valueTemplateInput')}
              className="vis_editor__input-grows"
              onChange={handleTextChange('value_template')}
              value={model.value_template}
            />
          </div>
          <div className="vis_editor__series_config-row">
            <label className="vis_editor__label" htmlFor={htmlId('filterInput')}>Filter</label>
            <input
              id={htmlId('filterInput')}
              className="vis_editor__input-grows"
              onChange={handleTextChange('filter')}
              value={model.filter}
            />
            <label className="vis_editor__label">Show Trend Arrows</label>
            <YesNo
              value={model.trend_arrows}
              name="trend_arrows"
              onChange={this.props.onChange}
            />
          </div>
          <div className="vis_editor__series_config-row">
            <div className="vis_editor__row_item">
              <FieldSelect
                fields={this.props.fields}
                indexPattern={this.props.panel.index_pattern}
                value={model.aggregate_by}
                onChange={handleSelectChange('aggregate_by')}
              />
            </div>
            <label className="vis_editor__label" htmlFor={htmlId('aggregateFunctionInput')}>Aggregate Function</label>
            <div className="vis_editor__row_item">
              <Select
                inputProps={{ id: htmlId('aggregateFunctionInput') }}
                value={model.aggregate_function}
                options={functionOptions}
                onChange={handleSelectChange('aggregate_function')}
              />
            </div>
          </div>
          <div className="vis_editor__series_config-row summarize__colorRules">
            <ColorRules
              primaryName="text"
              primaryVarName="text"
              hideSecondary={true}
              model={model}
              onChange={this.props.onChange}
              name="color_rules"
            />
          </div>
        </div>
      </div>
    );
  }

}

TableSeriesConfig.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func
};

export default TableSeriesConfig;


