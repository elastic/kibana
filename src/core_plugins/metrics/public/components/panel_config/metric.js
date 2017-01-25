import React, { Component, PropTypes } from 'react';
import SeriesEditor from '../series_editor';
import IndexPattern from '../index_pattern';
import Select from 'react-select';
import createSelectHandler from '../lib/create_select_handler';
import createTextHandler from '../lib/create_text_handler';
import DataFormatPicker from '../data_format_picker';
import ColorRules from '../color_rules';
import YesNo from '../yes_no';
import uuid from 'node-uuid';

class MetricPanelConfig extends Component {

  constructor(props) {
    super(props);
    this.state = { selectedTab: 'data' };
  }

  componentWillMount() {
    const { model } = this.props;
    if (!model.background_color_rules || (model.background_color_rules && model.background_color_rules.length === 0)) {
      this.props.onChange({
        background_color_rules: [{ id: uuid.v1() }]
      });
    }
  }

  switchTab(selectedTab) {
    this.setState({ selectedTab });
  }

  render() {
    const { selectedTab } = this.state;
    const { model } = this.props;
    const handleSelectChange = createSelectHandler(this.props.onChange);
    const handleTextChange = createTextHandler(this.props.onChange, this.refs);
    const positionOptions = [
      { label: 'Right', value: 'right' },
      { label: 'Left', value: 'left' }
    ];
    let view;
    if (selectedTab === 'data') {
      view = (
        <SeriesEditor
          colorPicker={false}
          fields={this.props.fields}
          limit={2}
          model={this.props.model}
          name={this.props.name}
          onChange={this.props.onChange} />
      );
    } else {
      view = (
        <div className="vis_editor__container">
          <IndexPattern
            fields={this.props.fields}
            model={this.props.model}
            onChange={this.props.onChange}/>
          <div className="vis_editor__vis_config-row">
            <div className="vis_editor__label">Panel Filter</div>
            <input
              className="vis_editor__input-grows"
              type="text"
              ref="filter"
              onChange={handleTextChange('filter')}
              defaultValue={model.filter}/>
            <div className="vis_editor__label">Ignore Global Filter</div>
            <YesNo
              value={model.ignore_global_filter}
              name="ignore_global_filter"
              onChange={this.props.onChange}/>
          </div>
          <div className="vis_editor__label" style={{ margin: '0 10px 0 0' }}>Color Rules</div>
          <div className="vis_editor__vis_config-row">
            <ColorRules
              model={model}
              onChange={this.props.onChange}
              name="background_color_rules"/>
          </div>
        </div>
      );
    }
    return (
      <div>
        <div className="kbnTabs">
          <div className={`kbnTabs__tab${selectedTab === 'data' && '-active' || ''}`}
            onClick={e => this.switchTab('data')}>Data</div>
          <div className={`kbnTabs__tab${selectedTab === 'options' && '-active' || ''}`}
            onClick={e => this.switchTab('options')}>Panel Options</div>
        </div>
        {view}
      </div>
    );
  }

}

MetricPanelConfig.propTypes = {
  fields   : PropTypes.object,
  model    : PropTypes.object,
  onChange : PropTypes.func,
  visData  : PropTypes.object,
};

export default MetricPanelConfig;
