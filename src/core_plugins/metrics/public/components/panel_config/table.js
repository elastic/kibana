import React, { Component, PropTypes } from 'react';
import FieldSelect from '../aggs/field_select';
import SeriesEditor from '../series_editor';
import IndexPattern from '../index_pattern';
import createTextHandler from '../lib/create_text_handler';
import createSelectHandler from '../lib/create_select_handler';
import uuid from 'uuid';
import YesNo from '../yes_no';

class TablePanelConfig extends Component {

  constructor(props) {
    super(props);
    this.state = { selectedTab: 'data' };
  }

  componentWillMount() {
    const { model } = this.props;
    const parts = {};
    if (!model.bar_color_rules || (model.bar_color_rules && model.bar_color_rules.length === 0)) {
      parts.bar_color_rules = [{ id: uuid.v1() }];
    }
    this.props.onChange(parts);
  }

  switchTab(selectedTab) {
    this.setState({ selectedTab });
  }

  render() {
    const { selectedTab } = this.state;
    const defaults = { drilldown_url: '', filter: '', pivot_label: '', pivot_rows: 10 };
    const model = { ...defaults, ...this.props.model };
    const handleSelectChange = createSelectHandler(this.props.onChange);
    const handleTextChange = createTextHandler(this.props.onChange);
    let view;
    if (selectedTab === 'data') {
      view = (
        <div>
          <div className="vis_editor__table-pivot-fields">
            <div className="vis_editor__container">
              <div className="vis_ediotr__vis_config-row">
                <p>For the table visualization you need to define a field to
                  group by using a terms aggregation.</p>
              </div>
              <div className="vis_editor__vis_config-row">
                <div className="vis_editor__label">Group By Field</div>
                <div className="vis_editor__row_item">
                  <FieldSelect
                    fields={this.props.fields}
                    value={model.pivot_id}
                    indexPattern={model.index_pattern}
                    onChange={handleSelectChange('pivot_id')} />
                </div>
                <div className="vis_editor__label">Column Label</div>
                <input
                  className="vis_editor__input-grows"
                  type="text"
                  onChange={handleTextChange('pivot_label')}
                  value={model.pivot_label}/>
                <div className="vis_editor__label">Rows</div>
                <input
                  className="vis_editor__input-number"
                  type="number"
                  onChange={handleTextChange('pivot_rows')}
                  value={model.pivot_rows}/>
              </div>
            </div>
          </div>
          <SeriesEditor
            fields={this.props.fields}
            model={this.props.model}
            name={this.props.name}
            onChange={this.props.onChange} />
        </div>
      );
    } else {
      view = (
        <div className="vis_editor__container">
          <div className="vis_editor__vis_config-row">
            <div className="vis_editor__label">Item Url (This supports mustache templating.
              <code>{'{{key}}'}</code> is set to the term)</div>
            <input
              className="vis_editor__input-grows"
              onChange={handleTextChange('drilldown_url')}
              value={model.drilldown_url}/>
          </div>
          <IndexPattern
            fields={this.props.fields}
            model={this.props.model}
            onChange={this.props.onChange}/>
          <div className="vis_editor__vis_config-row">
            <div className="vis_editor__label">Panel Filter</div>
            <input
              className="vis_editor__input-grows"
              type="text"
              onChange={handleTextChange('filter')}
              value={model.filter}/>
            <div className="vis_editor__label">Ignore Global Filter</div>
            <YesNo
              value={model.ignore_global_filter}
              name="ignore_global_filter"
              onChange={this.props.onChange}/>
          </div>
        </div>
      );
    }
    return (
      <div>
        <div className="kbnTabs">
          <div className={`kbnTabs__tab${selectedTab === 'data' && '-active' || ''}`}
            onClick={() => this.switchTab('data')}>Columns</div>
          <div className={`kbnTabs__tab${selectedTab === 'options' && '-active' || ''}`}
            onClick={() => this.switchTab('options')}>Panel Options</div>
        </div>
        {view}
      </div>
    );
  }

}

TablePanelConfig.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func,
  visData: PropTypes.object,
};

export default TablePanelConfig;

