import SeriesEditor from '../series_editor';
import IndexPattern from '../index_pattern';
import React from 'react';
import Select from 'react-select';
import createSelectHandler from '../../../lib/create_select_handler';
import createTextHandler from '../../../lib/create_text_handler';
import DataFormatPicker from '../data_format_picker';
import ColorPicker from '../color_picker';
import YesNo from 'plugins/metrics/components/yes_no';
export default React.createClass({
  getInitialState() {
    return { selectedTab: 'series' };
  },

  switchTab(selectedTab) {
    this.setState({ selectedTab });
  },

  render() {
    const { model } = this.props;
    const { selectedTab } = this.state;
    const handleSelectChange = createSelectHandler(this.props.onChange);
    const handleTextChange = createTextHandler(this.props.onChange, this.refs);
    const positionOptions = [
      { label: 'Right', value: 'right' },
      { label: 'Left', value: 'left' }
    ];
    const legendPositionOptions = [
      { label: 'Right', value: 'right' },
      { label: 'Left', value: 'left' },
      { label: 'Bottom', value: 'bottom' }
    ];
    let view;
    if (selectedTab === 'series') {
      view = (<SeriesEditor {...this.props}/>);
    } else {
      view = (
        <div className="vis_editor__container">
          <IndexPattern with-interval={true} {...this.props}/>
          <div className="vis_editor__vis_config-row">
            <div className="vis_editor__label">Axis Min</div>
            <input
              className="vis_editor__input-grows"
              type="text"
              ref="axis_min"
              onChange={handleTextChange('axis_min')}
              defaultValue={model.axis_min}/>
            <div className="vis_editor__label">Axis Max</div>
            <input
              className="vis_editor__input-grows"
              type="text"
              ref="axis_max"
              onChange={handleTextChange('axis_max')}
              defaultValue={model.axis_max}/>
            <div className="vis_editor__label">Axis Position</div>
            <div className="vis_editor__row_item">
              <Select
                autosize={false}
                clearable={false}
                options={positionOptions}
                value={model.axis_position}
                onChange={handleSelectChange('axis_position')}/>
            </div>
          </div>
          <div className="vis_editor__vis_config-row">
            <div className="vis_editor__label">Background Color</div>
            <ColorPicker
              onChange={this.props.onChange}
              name="background_color"
              value={model.background_color}/>
            <div className="vis_editor__label">Show Legend</div>
            <YesNo
              value={model.show_legend}
              name="show_legend"
              onChange={this.props.onChange}/>
            <div className="vis_editor__label">Legend Position</div>
            <div className="vis_editor__row_item">
              <Select
                clearable={false}
                options={legendPositionOptions}
                value={model.legend_position}
                onChange={handleSelectChange('legend_position')}/>
            </div>
          </div>
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
        </div>
      );
    }
    return (
      <div>
        <div className="kbnTabs">
          <div className={`kbnTabs__tab${selectedTab === 'series' && '-active' || ''}`}
            onClick={e => this.switchTab('series')}>Series</div>
          <div className={`kbnTabs__tab${selectedTab === 'options' && '-active' || ''}`}
            onClick={e => this.switchTab('options')}>Panel Options</div>
        </div>
        {view}
      </div>
    );
  }
});

