import React, { Component, PropTypes } from 'react';
import SeriesEditor from '../series_editor';
import AnnotationsEditor from '../annotations_editor';
import IndexPattern from '../index_pattern';
import Select from 'react-select';
import createSelectHandler from '../lib/create_select_handler';
import createTextHandler from '../lib/create_text_handler';
import ColorPicker from '../color_picker';
import YesNo from '../yes_no';

class TimeseriesPanelConfig extends Component {

  constructor(props) {
    super(props);
    this.state = { selectedTab: 'data' };
  }

  switchTab(selectedTab) {
    this.setState({ selectedTab });
  }

  render() {
    const defaults = {
      filter: '',
      axis_max: '',
      axis_min: '',
      legend_position: 'right'
    };
    const model = { ...defaults, ...this.props.model };
    const { selectedTab } = this.state;
    const handleSelectChange = createSelectHandler(this.props.onChange);
    const handleTextChange = createTextHandler(this.props.onChange);
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
    if (selectedTab === 'data') {
      view = (
        <SeriesEditor
          fields={this.props.fields}
          model={this.props.model}
          name={this.props.name}
          onChange={this.props.onChange} />
      );
    } else if (selectedTab === 'annotations') {
      view = (
        <AnnotationsEditor
          fields={this.props.fields}
          model={this.props.model}
          name="annotations"
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
            <div className="vis_editor__label">Axis Min</div>
            <input
              className="vis_editor__input-grows"
              type="text"
              onChange={handleTextChange('axis_min')}
              value={model.axis_min}/>
            <div className="vis_editor__label">Axis Max</div>
            <input
              className="vis_editor__input-grows"
              type="text"
              onChange={handleTextChange('axis_max')}
              value={model.axis_max}/>
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
            onClick={() => this.switchTab('data')}>Data</div>
          <div className={`kbnTabs__tab${selectedTab === 'options' && '-active' || ''}`}
            onClick={() => this.switchTab('options')}>Panel Options</div>
          <div className={`kbnTabs__tab${selectedTab === 'annotations' && '-active' || ''}`}
            onClick={() => this.switchTab('annotations')}>Annotations</div>
        </div>
        {view}
      </div>
    );
  }


}

TimeseriesPanelConfig.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func,
  visData: PropTypes.object,
};

export default TimeseriesPanelConfig;
