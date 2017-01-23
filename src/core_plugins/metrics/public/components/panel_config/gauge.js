import SeriesEditor from '../series_editor';
import IndexPattern from '../index_pattern';
import React from 'react';
import Select from 'react-select';
import createSelectHandler from '../lib/create_select_handler';
import createTextHandler from '../lib/create_text_handler';
import createNumberHandler from '../lib/create_number_handler';
import DataFormatPicker from '../data_format_picker';
import ColorRules from '../color_rules';
import ColorPicker from '../color_picker';
import uuid from 'node-uuid';
import YesNo from 'plugins/metrics/components/yes_no';
export default React.createClass({

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
  },

  getInitialState() {
    return { selectedTab: 'data' };
  },

  switchTab(selectedTab) {
    this.setState({ selectedTab });
  },

  render() {
    const { selectedTab } = this.state;
    const { model } = this.props;
    const handleSelectChange = createSelectHandler(this.props.onChange);
    const handleTextChange = createTextHandler(this.props.onChange, this.refs);
    const handleNumberChange = createNumberHandler(this.props.onChange, this.refs);
    const positionOptions = [
      { label: 'Right', value: 'right' },
      { label: 'Left', value: 'left' }
    ];
    const styleOptions = [
      { label: 'Circle', value: 'circle' },
      { label: 'Half Circle', value: 'half' }
    ];
    let view;
    if (selectedTab === 'data') {
      view = (<SeriesEditor limit={1} colorPicker={true} {...this.props}/>);
    } else {
      view = (
        <div className="vis_editor__container">
          <IndexPattern with-interval={true} {...this.props}/>
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
              ref="gauge_max"
              onChange={handleTextChange('gauge_max')}
              style={{ width: '20px' }}
              defaultValue={model.gauge_max}/>
            <div className="vis_editor__label">Gauge Style</div>
            <Select
              autosize={false}
              clearable={false}
              options={styleOptions}
              value={model.gauge_style || 'circle'}
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
              ref="gauge_inner_width"
              style={{ width: '20px' }}
              onChange={handleTextChange('gauge_inner_width')}
              defaultValue={model.gauge_inner_width}/>
            <div className="vis_editor__label">Gauge Line Width</div>
            <input
              className="vis_editor__input-grows"
              type="number"
              style={{ width: 20 }}
              ref="gauge_width"
              onChange={handleTextChange('gauge_width')}
              defaultValue={model.gauge_width}/>
          </div>
          <div className="vis_editor__label" style={{ margin: '0 10px 0 0' }}>Color Rules</div>
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
            onClick={e => this.switchTab('data')}>Data</div>
          <div className={`kbnTabs__tab${selectedTab === 'options' && '-active' || ''}`}
            onClick={e => this.switchTab('options')}>Panel Options</div>
        </div>
        {view}
      </div>
    );
  }
});


