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
import { SeriesEditor } from '../series_editor';
import { AnnotationsEditor } from '../annotations_editor';
import { IndexPattern } from '../index_pattern';
import { createSelectHandler } from '../lib/create_select_handler';
import { createTextHandler } from '../lib/create_text_handler';
import { ColorPicker } from '../color_picker';
import { YesNo } from '../yes_no';
import {
  htmlIdGenerator,
  EuiComboBox,
  EuiTabs,
  EuiTab,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFormLabel,
  EuiSpacer,
  EuiFieldText,
  EuiTitle,
  EuiHorizontalRule,
} from '@elastic/eui';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import { Storage } from 'ui/storage';
import { data } from 'plugins/data';
import { getDefaultQueryLanguage } from '../lib/get_default_query_language';
const { QueryBarInput } = data.query.ui;
const localStorage = new Storage(window.localStorage);
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
      filter: { query: '', language: getDefaultQueryLanguage() },
      axis_max: '',
      axis_min: '',
      legend_position: 'right',
      show_grid: 1,
    };
    const model = { ...defaults, ...this.props.model };
    const { selectedTab } = this.state;
    const handleSelectChange = createSelectHandler(this.props.onChange);
    const handleTextChange = createTextHandler(this.props.onChange);
    const htmlId = htmlIdGenerator();
    const { intl } = this.props;

    const positionOptions = [
      {
        label: intl.formatMessage({
          id: 'tsvb.timeseries.positionOptions.rightLabel',
          defaultMessage: 'Right',
        }),
        value: 'right',
      },
      {
        label: intl.formatMessage({
          id: 'tsvb.timeseries.positionOptions.leftLabel',
          defaultMessage: 'Left',
        }),
        value: 'left',
      },
    ];
    const selectedPositionOption = positionOptions.find(option => {
      return model.axis_position === option.value;
    });
    const scaleOptions = [
      {
        label: intl.formatMessage({
          id: 'tsvb.timeseries.scaleOptions.normalLabel',
          defaultMessage: 'Normal',
        }),
        value: 'normal',
      },
      {
        label: intl.formatMessage({
          id: 'tsvb.timeseries.scaleOptions.logLabel',
          defaultMessage: 'Log',
        }),
        value: 'log',
      },
    ];
    const selectedAxisScaleOption = scaleOptions.find(option => {
      return model.axis_scale === option.value;
    });
    const legendPositionOptions = [
      {
        label: intl.formatMessage({
          id: 'tsvb.timeseries.legendPositionOptions.rightLabel',
          defaultMessage: 'Right',
        }),
        value: 'right',
      },
      {
        label: intl.formatMessage({
          id: 'tsvb.timeseries.legendPositionOptions.leftLabel',
          defaultMessage: 'Left',
        }),
        value: 'left',
      },
      {
        label: intl.formatMessage({
          id: 'tsvb.timeseries.legendPositionOptions.bottomLabel',
          defaultMessage: 'Bottom',
        }),
        value: 'bottom',
      },
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
          visData$={this.props.visData$}
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
        <div className="tvbPanelConfig__container">
          <EuiPanel>
            <EuiTitle size="s">
              <span>
                <FormattedMessage id="tsvb.timeseries.optionsTab.dataLabel" defaultMessage="Data" />
              </span>
            </EuiTitle>
            <EuiSpacer size="m" />

            <IndexPattern
              fields={this.props.fields}
              model={this.props.model}
              onChange={this.props.onChange}
            />

            <EuiHorizontalRule />

            <EuiFlexGroup responsive={false} wrap={true}>
              <EuiFlexItem>
                <EuiFormRow
                  id={htmlId('panelFilter')}
                  label={
                    <FormattedMessage
                      id="tsvb.timeseries.optionsTab.panelFilterLabel"
                      defaultMessage="Panel filter"
                    />
                  }
                  fullWidth
                >
                  <QueryBarInput
                    query={{
                      language: model.filter.language || getDefaultQueryLanguage(),
                      query: model.filter.query || '',
                    }}
                    onChange={filter => this.props.onChange({ filter })}
                    appName={'VisEditor'}
                    indexPatterns={[model.index_pattern || model.default_index_pattern]}
                    store={localStorage}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormLabel>
                  <FormattedMessage
                    id="tsvb.timeseries.optionsTab.ignoreGlobalFilterLabel"
                    defaultMessage="Ignore global filter?"
                  />
                </EuiFormLabel>
                <EuiSpacer size="s" />
                <YesNo
                  value={model.ignore_global_filter}
                  name="ignore_global_filter"
                  onChange={this.props.onChange}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>

          <EuiSpacer />

          <EuiPanel>
            <EuiTitle size="s">
              <span>
                <FormattedMessage
                  id="tsvb.timeseries.optionsTab.styleLabel"
                  defaultMessage="Style"
                />
              </span>
            </EuiTitle>
            <EuiSpacer size="m" />

            <EuiFlexGroup responsive={false} wrap={true} alignItems="center">
              <EuiFlexItem>
                <EuiFormRow
                  id={htmlId('axisMin')}
                  label={
                    <FormattedMessage
                      id="tsvb.timeseries.optionsTab.axisMinLabel"
                      defaultMessage="Axis min"
                    />
                  }
                >
                  <EuiFieldText onChange={handleTextChange('axis_min')} value={model.axis_min} />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  id={htmlId('axisMax')}
                  label={
                    <FormattedMessage
                      id="tsvb.timeseries.optionsTab.axisMaxLabel"
                      defaultMessage="Axis max"
                    />
                  }
                >
                  <EuiFieldText onChange={handleTextChange('axis_max')} value={model.axis_max} />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  id={htmlId('axisPos')}
                  label={
                    <FormattedMessage
                      id="tsvb.timeseries.optionsTab.axisPositionLabel"
                      defaultMessage="Axis position"
                    />
                  }
                >
                  <EuiComboBox
                    isClearable={false}
                    options={positionOptions}
                    selectedOptions={selectedPositionOption ? [selectedPositionOption] : []}
                    onChange={handleSelectChange('axis_position')}
                    singleSelection={{ asPlainText: true }}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  id={htmlId('axisScale')}
                  label={
                    <FormattedMessage
                      id="tsvb.timeseries.optionsTab.axisScaleLabel"
                      defaultMessage="Axis scale"
                    />
                  }
                >
                  <EuiComboBox
                    isClearable={false}
                    options={scaleOptions}
                    selectedOptions={selectedAxisScaleOption ? [selectedAxisScaleOption] : []}
                    onChange={handleSelectChange('axis_scale')}
                    singleSelection={{ asPlainText: true }}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiHorizontalRule />

            <EuiFlexGroup responsive={false} wrap={true} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiFormLabel style={{ marginBottom: 0 }}>
                  <FormattedMessage
                    id="tsvb.timeseries.optionsTab.backgroundColorLabel"
                    defaultMessage="Background color:"
                  />
                </EuiFormLabel>
              </EuiFlexItem>
              <EuiFlexItem>
                <ColorPicker
                  onChange={this.props.onChange}
                  name="background_color"
                  value={model.background_color}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormLabel style={{ marginBottom: 0 }}>
                  <FormattedMessage
                    id="tsvb.timeseries.optionsTab.showLegendLabel"
                    defaultMessage="Show legend?"
                  />
                </EuiFormLabel>
              </EuiFlexItem>
              <EuiFlexItem>
                <YesNo
                  value={model.show_legend}
                  name="show_legend"
                  onChange={this.props.onChange}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormLabel style={{ marginBottom: 0 }} htmlFor={htmlId('legendPos')}>
                  <FormattedMessage
                    id="tsvb.timeseries.optionsTab.legendPositionLabel"
                    defaultMessage="Legend position"
                  />
                </EuiFormLabel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiComboBox
                  isClearable={false}
                  id={htmlId('legendPos')}
                  options={legendPositionOptions}
                  selectedOptions={selectedLegendPosOption ? [selectedLegendPosOption] : []}
                  onChange={handleSelectChange('legend_position')}
                  singleSelection={{ asPlainText: true }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormLabel style={{ marginBottom: 0 }}>
                  <FormattedMessage
                    id="tsvb.timeseries.optionsTab.displayGridLabel"
                    defaultMessage="Display grid"
                  />
                </EuiFormLabel>
              </EuiFlexItem>
              <EuiFlexItem>
                <YesNo value={model.show_grid} name="show_grid" onChange={this.props.onChange} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </div>
      );
    }
    return (
      <div>
        <EuiTabs size="s">
          <EuiTab isSelected={selectedTab === 'data'} onClick={() => this.switchTab('data')}>
            <FormattedMessage id="tsvb.timeseries.dataTab.dataButtonLabel" defaultMessage="Data" />
          </EuiTab>
          <EuiTab isSelected={selectedTab === 'options'} onClick={() => this.switchTab('options')}>
            <FormattedMessage
              id="tsvb.timeseries.optionsTab.panelOptionsButtonLabel"
              defaultMessage="Panel options"
            />
          </EuiTab>
          <EuiTab
            isSelected={selectedTab === 'annotations'}
            onClick={() => this.switchTab('annotations')}
          >
            <FormattedMessage
              id="tsvb.timeseries.annotationsTab.annotationsButtonLabel"
              defaultMessage="Annotations"
            />
          </EuiTab>
        </EuiTabs>
        {view}
      </div>
    );
  }
}

TimeseriesPanelConfigUi.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func,
  visData$: PropTypes.object,
};

export const TimeseriesPanelConfig = injectI18n(TimeseriesPanelConfigUi);
