/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import SeriesEditor from '../series_editor';
import AnnotationsEditor from '../annotations_editor';
import { IndexPattern } from '../index_pattern';
import createSelectHandler from '../lib/create_select_handler';
import createTextHandler from '../lib/create_text_handler';
import ColorPicker from '../color_picker';
import YesNo from '../yes_no';
import {
  htmlIdGenerator,
  EuiComboBox,
} from '@elastic/eui';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

class TimeseriesPanelConfigUi extends Component {

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
    const { intl } = this.props;

    const positionOptions = [
      {
        label: intl.formatMessage({ id: 'metrics.timeseries.positionOptions.rightLabel', defaultMessage: 'Right' }),
        value: 'right'
      },
      {
        label: intl.formatMessage({ id: 'metrics.timeseries.positionOptions.leftLabel', defaultMessage: 'Left' }),
        value: 'left'
      }
    ];
    const selectedPositionOption = positionOptions.find(option => {
      return model.axis_position === option.value;
    });
    const scaleOptions = [
      {
        label: intl.formatMessage({ id: 'metrics.timeseries.scaleOptions.normalLabel', defaultMessage: 'Normal' }),
        value: 'normal'
      },
      {
        label: intl.formatMessage({ id: 'metrics.timeseries.scaleOptions.logLabel', defaultMessage: 'Log' }),
        value: 'log' }
    ];
    const selectedAxisScaleOption = scaleOptions.find(option => {
      return model.axis_scale === option.value;
    });
    const legendPositionOptions = [
      {
        label: intl.formatMessage({ id: 'metrics.timeseries.legendPositionOptions.rightLabel', defaultMessage: 'Right' }),
        value: 'right'
      },
      {
        label: intl.formatMessage({ id: 'metrics.timeseries.legendPositionOptions.leftLabel', defaultMessage: 'Left' }),
        value: 'left'
      },
      {
        label: intl.formatMessage({ id: 'metrics.timeseries.legendPositionOptions.bottomLabel', defaultMessage: 'Bottom' }),
        value: 'bottom'
      }
    ];
    const selectedLegendPosOption = legendPositionOptions.find(option => {
      return model.legend_position === option.value;
    });

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
            <label className="vis_editor__label" htmlFor={htmlId('axisMin')}>
              <FormattedMessage
                id="metrics.timeseries.optionsTab.axisMinLabel"
                defaultMessage="Axis Min"
              />
            </label>
            <input
              id={htmlId('axisMin')}
              className="vis_editor__input-grows"
              type="text"
              onChange={handleTextChange('axis_min')}
              value={model.axis_min}
            />
            <label className="vis_editor__label" htmlFor={htmlId('axisMax')}>
              <FormattedMessage
                id="metrics.timeseries.optionsTab.axisMaxLabel"
                defaultMessage="Axis Max"
              />
            </label>
            <input
              id={htmlId('axisMax')}
              className="vis_editor__input-grows"
              type="text"
              onChange={handleTextChange('axis_max')}
              value={model.axis_max}
            />
            <label className="vis_editor__label" htmlFor={htmlId('axisPos')}>
              <FormattedMessage
                id="metrics.timeseries.optionsTab.axisPositionLabel"
                defaultMessage="Axis Position"
              />
            </label>
            <div className="vis_editor__row_item">
              <EuiComboBox
                isClearable={false}
                id={htmlId('axisPos')}
                options={positionOptions}
                selectedOptions={selectedPositionOption ? [selectedPositionOption] : []}
                onChange={handleSelectChange('axis_position')}
                singleSelection={true}
              />
            </div>
            <label className="vis_editor__label" htmlFor={htmlId('axisPos')}>
              <FormattedMessage
                id="metrics.timeseries.optionsTab.axisScaleLabel"
                defaultMessage="Axis Scale"
              />
            </label>
            <div className="vis_editor__row_item">
              <EuiComboBox
                isClearable={false}
                id={htmlId('axisScale')}
                options={scaleOptions}
                selectedOptions={selectedAxisScaleOption ? [selectedAxisScaleOption] : []}
                onChange={handleSelectChange('axis_scale')}
                singleSelection={true}
              />
            </div>
          </div>
          <div className="vis_editor__vis_config-row">
            <div className="vis_editor__label">
              <FormattedMessage
                id="metrics.timeseries.optionsTab.backgroundColorLabel"
                defaultMessage="Background Color"
              />
            </div>
            <ColorPicker
              onChange={this.props.onChange}
              name="background_color"
              value={model.background_color}
            />
            <div className="vis_editor__label">
              <FormattedMessage
                id="metrics.timeseries.optionsTab.showLegendLabel"
                defaultMessage="Show Legend"
              />
            </div>
            <YesNo
              value={model.show_legend}
              name="show_legend"
              onChange={this.props.onChange}
            />
            <label className="vis_editor__label" htmlFor={htmlId('legendPos')}>
              <FormattedMessage
                id="metrics.timeseries.optionsTab.legendPositionLabel"
                defaultMessage="Legend Position"
              />
            </label>
            <div className="vis_editor__row_item">
              <EuiComboBox
                isClearable={false}
                id={htmlId('legendPos')}
                options={legendPositionOptions}
                selectedOptions={selectedLegendPosOption ? [selectedLegendPosOption] : []}
                onChange={handleSelectChange('legend_position')}
                singleSelection={true}
              />
            </div>
            <div className="vis_editor__label">
              <FormattedMessage
                id="metrics.timeseries.optionsTab.displayGridnLabel"
                defaultMessage="Display Grid"
              />
            </div>
            <YesNo
              value={model.show_grid}
              name="show_grid"
              onChange={this.props.onChange}
            />
          </div>
          <div className="vis_editor__vis_config-row">
            <label className="vis_editor__label" htmlFor={htmlId('panelFilter')}>
              <FormattedMessage
                id="metrics.timeseries.optionsTab.panelFilterLabel"
                defaultMessage="Panel Filter"
              />
            </label>
            <input
              id={htmlId('panelFilter')}
              className="vis_editor__input-grows"
              type="text"
              onChange={handleTextChange('filter')}
              value={model.filter}
            />
            <div className="vis_editor__label">
              <FormattedMessage
                id="metrics.timeseries.optionsTab.ignoreGlobalFilterLabel"
                defaultMessage="Ignore Global Filter"
              />
            </div>
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
          >
            <FormattedMessage
              id="metrics.timeseries.dataTab.dataButtonLabel"
              defaultMessage="Data"
            />
          </button>
          <button
            role="tab"
            aria-selected={selectedTab === 'options'}
            className={`kbnTabs__tab${selectedTab === 'options' && '-active' || ''}`}
            onClick={() => this.switchTab('options')}
          >
            <FormattedMessage
              id="metrics.timeseries.optionsTab.panelOptionsButtonLabel"
              defaultMessage="Panel Options"
            />
          </button>
          <button
            role="tab"
            aria-selected={selectedTab === 'annotations'}
            className={`kbnTabs__tab${selectedTab === 'annotations' && '-active' || ''}`}
            onClick={() => this.switchTab('annotations')}
          >
            <FormattedMessage
              id="metrics.timeseries.annotationsTab.annotationsButtonLabel"
              defaultMessage="Annotations"
            />
          </button>
        </div>
        {view}
      </div>
    );
  }


}

TimeseriesPanelConfigUi.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func,
  visData: PropTypes.object,
};

const TimeseriesPanelConfig = injectI18n(TimeseriesPanelConfigUi);
export default TimeseriesPanelConfig;
