import React, { Component, PropTypes } from 'react';
import SeriesEditor from '../series_editor';
import IndexPattern from '../index_pattern';
import Select from 'react-select';
import createSelectHandler from '../lib/create_select_handler';
import createTextHandler from '../lib/create_text_handler';
import ColorRules from '../color_rules';
import ColorPicker from '../color_picker';
import uuid from 'node-uuid';
import YesNo from 'plugins/metrics/components/yes_no';

class GaugePanelConfig extends Component {

  constructor(props) {
    super(props);
    this.state = { selectedTab: 'data' };
  }

  componentWillMount() {
    const { model } = this.props;
    const parts = {};
    if (!model.gauge_color_rules ||
      (model.gauge_color_rules && model.gauge_color_rules.length === 0)) {
      parts.gauge_color_rules = [{ id: uuid.v1() }];
    }
    if (model.gauge_width == null) parts.gauge_width = 10;
    if (model.gauge_inner_width == null) parts.gauge_inner_width = 10;
    if (model.gauge_style == null) parts.gauge_style = 'half';
    this.props.onChange(parts);
  }

  switchTab(selectedTab) {
    this.setState({ selectedTab });
  }

  render() {
    const { selectedTab } = this.state;
    const defaults = {
      gauge_max: '',
      filter: '',
      gauge_style: 'circle',
      gauge_inner_width: '',
      gauge_width: ''
    };
    const model = { ...defaults, ...this.props.model };
    const handleSelectChange = createSelectHandler(this.props.onChange);
    const handleTextChange = createTextHandler(this.props.onChange);
    const styleOptions = [
      { label: 'Circle', value: 'circle' },
      { label: 'Half Circle', value: 'half' }
    ];
    let view;
    if (selectedTab === 'data') {
      view = (
        <SeriesEditor
          colorPicker={true}
          fields={this.props.fields}
          limit={1}
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
              onChange={handleTextChange('filter')}
              value={model.filter}/>
            <div className="vis_editor__label">Ignore Global Filter</div>
            <YesNo
              value={model.ignore_global_filter}
              name="ignore_global_filter"
              onChange={this.props.onChange}/>
          </div>
          <div className="vis_editor__vis_config-row">
            <div className="vis_editor__label">Background Color</div>
            <ColorPicker
              onChange={this.props.onChange}
              name="background_color"
              value={model.background_color}/>
            <div className="vis_editor__label">Gauge Max (empty for auto)</div>
            <input
              className="vis_editor__input-grows"
              type="number"
              onChange={handleTextChange('gauge_max')}
              value={model.gauge_max}/>
            <div className="vis_editor__label">Gauge Style</div>
            <Select
              autosize={false}
              clearable={false}
              options={styleOptions}
              value={model.gauge_style}
              onChange={handleSelectChange('gauge_style')}/>

          </div>
          <div className="vis_editor__vis_config-row">
            <div className="vis_editor__label">Inner Color</div>
            <ColorPicker
              onChange={this.props.onChange}
              name="gauge_inner_color"
              value={model.gauge_inner_color}/>
            <div className="vis_editor__label">Inner Line Width</div>
            <input
              className="vis_editor__input-grows"
              type="number"
              onChange={handleTextChange('gauge_inner_width')}
              value={model.gauge_inner_width}/>
            <div className="vis_editor__label">Gauge Line Width</div>
            <input
              className="vis_editor__input-grows"
              type="number"
              onChange={handleTextChange('gauge_width')}
              value={model.gauge_width} />
          </div>
          <div>
            <div className="vis_editor__label">Color Rules</div>
          </div>
          <div className="vis_editor__vis_config-row">
            <ColorRules
              primaryName="gauge color"
              primaryVarName="gauge"
              secondaryName="text color"
              secondaryVarName="text"
              model={model}
              onChange={this.props.onChange}
              name="gauge_color_rules"/>
          </div>
        </div>
      );
    }
    return (
      <div>
        <div className="kbnTabs">
          <div className={`kbnTabs__tab${selectedTab === 'data' && '-active' || ''}`}
            onClick={() => this.switchTab('data')}>Data</div>
          <div className={`kbnTabs__tab${selectedTab === 'options' && '-active' || ''}`}
            onClick={() => this.switchTab('options')}>Panel Options</div>
        </div>
        {view}
      </div>
    );
  }

}

GaugePanelConfig.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func,
  visData: PropTypes.object,
};

export default GaugePanelConfig;
