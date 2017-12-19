import PropTypes from 'prop-types';
import React, { Component } from 'react';
import SeriesEditor from '../series_editor';
import AnnotationsEditor from '../annotations_editor';
import { IndexPattern } from '../index_pattern';
import Select from 'react-select';
import createSelectHandler from '../lib/create_select_handler';
import createTextHandler from '../lib/create_text_handler';
import ColorPicker from '../color_picker';
import YesNo from '../yes_no';
import { htmlIdGenerator } from '@elastic/eui';

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
      legend_position: 'right',
      show_grid: 1
    };
    const model = { ...defaults, ...this.props.model };
    const { selectedTab } = this.state;
    const handleSelectChange = createSelectHandler(this.props.onChange);
    const handleTextChange = createTextHandler(this.props.onChange);
    const htmlId = htmlIdGenerator();
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
          onChange={this.props.onChange}
        />
      );
    } else if (selectedTab === 'annotations') {
      view = (
        <AnnotationsEditor
          fields={this.props.fields}
          model={this.props.model}
          name="annotations"
          onChange={this.props.onChange}
        />
      );
    } else {
      view = (
        <div className="vis_editor__container">
          <IndexPattern
            fields={this.props.fields}
            model={this.props.model}
            onChange={this.props.onChange}
          />
          <div className="vis_editor__vis_config-row">
            <label className="vis_editor__label" htmlFor={htmlId('axisMin')}>Axis Min</label>
            <input
              id={htmlId('axisMin')}
              className="vis_editor__input-grows"
              type="text"
              onChange={handleTextChange('axis_min')}
              value={model.axis_min}
            />
            <label className="vis_editor__label" htmlFor={htmlId('axisMax')}>Axis Max</label>
            <input
              id={htmlId('axisMax')}
              className="vis_editor__input-grows"
              type="text"
              onChange={handleTextChange('axis_max')}
              value={model.axis_max}
            />
            <label className="vis_editor__label" htmlFor={htmlId('axisPos')}>Axis Position</label>
            <div className="vis_editor__row_item">
              <Select
                inputProps={{ id: htmlId('axisPos') }}
                autosize={false}
                clearable={false}
                options={positionOptions}
                value={model.axis_position}
                onChange={handleSelectChange('axis_position')}
              />
            </div>
          </div>
          <div className="vis_editor__vis_config-row">
            <div className="vis_editor__label">Background Color</div>
            <ColorPicker
              onChange={this.props.onChange}
              name="background_color"
              value={model.background_color}
            />
            <div className="vis_editor__label">Show Legend</div>
            <YesNo
              value={model.show_legend}
              name="show_legend"
              onChange={this.props.onChange}
            />
            <label className="vis_editor__label" htmlFor={htmlId('legendPos')}>Legend Position</label>
            <div className="vis_editor__row_item">
              <Select
                inputProps={{ id: htmlId('legendPos') }}
                clearable={false}
                options={legendPositionOptions}
                value={model.legend_position}
                onChange={handleSelectChange('legend_position')}
              />
            </div>
            <div className="vis_editor__label">Display Grid</div>
            <YesNo
              value={model.show_grid}
              name="show_grid"
              onChange={this.props.onChange}
            />
          </div>
          <div className="vis_editor__vis_config-row">
            <label className="vis_editor__label" htmlFor={htmlId('panelFilter')}>Panel Filter</label>
            <input
              id={htmlId('panelFilter')}
              className="vis_editor__input-grows"
              type="text"
              onChange={handleTextChange('filter')}
              value={model.filter}
            />
            <div className="vis_editor__label">Ignore Global Filter</div>
            <YesNo
              value={model.ignore_global_filter}
              name="ignore_global_filter"
              onChange={this.props.onChange}
            />
          </div>
        </div>
      );
    }
    return (
      <div>
        <div className="kbnTabs" role="tablist">
          <button
            role="tab"
            aria-selected={selectedTab === 'data'}
            className={`kbnTabs__tab${selectedTab === 'data' && '-active' || ''}`}
            onClick={() => this.switchTab('data')}
          >Data
          </button>
          <button
            role="tab"
            aria-selected={selectedTab === 'options'}
            className={`kbnTabs__tab${selectedTab === 'options' && '-active' || ''}`}
            onClick={() => this.switchTab('options')}
          >Panel Options
          </button>
          <button
            role="tab"
            aria-selected={selectedTab === 'annotations'}
            className={`kbnTabs__tab${selectedTab === 'annotations' && '-active' || ''}`}
            onClick={() => this.switchTab('annotations')}
          >Annotations
          </button>
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
