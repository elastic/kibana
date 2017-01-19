import SeriesEditor from '../series_editor';
import _ from 'lodash';
import IndexPattern from '../index_pattern';
import React from 'react';
import Select from 'react-select';
import createSelectHandler from '../../../lib/create_select_handler';
import createTextHandler from '../../../lib/create_text_handler';
import DataFormatPicker from '../data_format_picker';
import ColorRules from '../color_rules';
import ColorPicker from '../color_picker';
import uuid from 'node-uuid';
import YesNo from 'plugins/metrics/components/yes_no';
export default React.createClass({

  componentWillMount() {
    const { model } = this.props;
    const parts = {};
    if (!model.bar_color_rules || (model.bar_color_rules && model.bar_color_rules.length === 0)) {
      parts.bar_color_rules = [{ id: uuid.v1() }];
    }
    if (model.series && model.series.length > 0) {
      parts.series = [_.assign({}, model.series[0])];
    }
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
    const { fields, model } = this.props;
    const handleSelectChange = createSelectHandler(this.props.onChange);
    const handleTextChange = createTextHandler(this.props.onChange, this.refs);
    const positionOptions = [
      { label: 'Right', value: 'right' },
      { label: 'Left', value: 'left' }
    ];
    let view;
    if (selectedTab === 'data') {
      view = (<SeriesEditor limit={1} colorPicker={false} {...this.props}/>);
    } else {
      view = (
        <div className="vis_editor__container">
          <div className="vis_editor__vis_config-row">
            <div className="vis_editor__label">Item Url (This supports mustache templating.
              <code>{'{{key}}'}</code> is set to the term)</div>
            <input
              className="vis_editor__input-grows"
              ref="drilldown_url"
              onChange={handleTextChange('drilldown_url')}
              defaultValue={model.drilldown_url}/>
          </div>
          <IndexPattern with-interval={true} {...this.props}/>
          <div className="vis_editor__vis_config-row">
            <div className="vis_editor__label">Background Color</div>
            <ColorPicker
              onChange={this.props.onChange}
              name="background_color"
              value={model.background_color}/>
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
              primaryVarName="bar_color"
              primaryName="bar"
              hideSecondary={true}
              onChange={this.props.onChange}
              name="bar_color_rules"/>
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

