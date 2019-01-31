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
import { IndexPattern } from '../index_pattern';
import createSelectHandler from '../lib/create_select_handler';
import createTextHandler from '../lib/create_text_handler';
import ColorRules from '../color_rules';
import ColorPicker from '../color_picker';
import uuid from 'uuid';
import YesNo from '../yes_no';
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
  EuiFieldNumber,
  EuiTitle,
  EuiHorizontalRule,
} from '@elastic/eui';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

class GaugePanelConfigUi extends Component {

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
    const { intl } = this.props;
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
      {
        label: intl.formatMessage({
          id: 'tsvb.gauge.styleOptions.circleLabel', defaultMessage: 'Circle' }),
        value: 'circle'
      },
      {
        label: intl.formatMessage({
          id: 'tsvb.gauge.styleOptions.halfCircleLabel', defaultMessage: 'Half Circle' }),
        value: 'half'
      }
    ];
    const htmlId = htmlIdGenerator();
    const selectedGaugeStyleOption = styleOptions.find(option => {
      return model.gauge_style === option.value;
    });
    let view;
    if (selectedTab === 'data') {
      view = (
        <SeriesEditor
          colorPicker={true}
          fields={this.props.fields}
          limit={1}
          model={this.props.model}
          name={this.props.name}
          onChange={this.props.onChange}
        />
      );
    } else {
      view = (
        <div className="tvbPanelConfig__container">
          <EuiPanel>
            <EuiTitle size="s">
              <span>
                <FormattedMessage
                  id="tsvb.gauge.optionsTab.dataLabel"
                  defaultMessage="Data"
                />
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
                  label={(<FormattedMessage
                    id="tsvb.gauge.optionsTab.panelFilterLabel"
                    defaultMessage="Panel filter"
                  />)}
                  fullWidth
                >
                  <EuiFieldText
                    onChange={handleTextChange('filter')}
                    value={model.filter}
                    fullWidth
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormLabel>
                  <FormattedMessage
                    id="tsvb.gauge.optionsTab.ignoreGlobalFilterLabel"
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
                  id="tsvb.gauge.optionsTab.styleLabel"
                  defaultMessage="Style"
                />
              </span>
            </EuiTitle>
            <EuiSpacer size="m" />

            <EuiFlexGroup responsive={false} wrap={true}>
              <EuiFlexItem>
                <EuiFormRow
                  id={htmlId('gaugeMax')}
                  label={(<FormattedMessage
                    id="tsvb.gauge.optionsTab.gaugeMaxLabel"
                    defaultMessage="Gauge max (empty for auto)"
                  />)}
                >
                  {/*
                    EUITODO: The following input couldn't be converted to EUI because of type mis-match.
                    It accepts a null value, but is passed a empty string.
                  */}
                  <input
                    id={htmlId('gaugeMax')}
                    className="tvbAgg__input"
                    type="number"
                    onChange={handleTextChange('gauge_max')}
                    value={model.gauge_max}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  id={htmlId('gaugeStyle')}
                  label={(<FormattedMessage
                    id="tsvb.gauge.optionsTab.gaugeStyleLabel"
                    defaultMessage="Gauge style"
                  />)}
                >
                  <EuiComboBox
                    isClearable={false}
                    options={styleOptions}
                    selectedOptions={selectedGaugeStyleOption ? [selectedGaugeStyleOption] : []}
                    onChange={handleSelectChange('gauge_style')}
                    singleSelection={{ asPlainText: true }}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  id={htmlId('innerLine')}
                  label={(<FormattedMessage
                    id="tsvb.gauge.optionsTab.innerLineWidthLabel"
                    defaultMessage="Inner line width"
                  />)}
                >
                  <EuiFieldNumber
                    onChange={handleTextChange('gauge_inner_width')}
                    value={Number(model.gauge_inner_width)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  id={htmlId('gaugeLine')}
                  label={(<FormattedMessage
                    id="tsvb.gauge.optionsTab.gaugeLineWidthLabel"
                    defaultMessage="Gauge line width"
                  />)}
                >
                  <EuiFieldNumber
                    onChange={handleTextChange('gauge_width')}
                    value={Number(model.gauge_width)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiHorizontalRule />

            <EuiFlexGroup responsive={false} wrap={true} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiFormLabel style={{ marginBottom: 0 }}>
                  <FormattedMessage
                    id="tsvb.gauge.optionsTab.backgroundColorLabel"
                    defaultMessage="Background color:"
                  />
                </EuiFormLabel>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <ColorPicker
                  onChange={this.props.onChange}
                  name="background_color"
                  value={model.background_color}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormLabel style={{ marginBottom: 0 }}>
                  <FormattedMessage
                    id="tsvb.gauge.optionsTab.innerColorLabel"
                    defaultMessage="Inner color:"
                  />
                </EuiFormLabel>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <ColorPicker
                  onChange={this.props.onChange}
                  name="gauge_inner_color"
                  value={model.gauge_inner_color}
                />
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiHorizontalRule />

            <EuiTitle size="xxs">
              <span>
                <FormattedMessage
                  id="tsvb.gauge.optionsTab.colorRulesLabel"
                  defaultMessage="Color rules"
                />
              </span>
            </EuiTitle>
            <EuiSpacer size="s" />
            <ColorRules
              primaryName="gauge color"
              primaryVarName="gauge"
              secondaryName="text color"
              secondaryVarName="text"
              model={model}
              onChange={this.props.onChange}
              name="gauge_color_rules"
            />
          </EuiPanel>
        </div>
      );
    }
    return (
      <div>
        <EuiTabs size="s">
          <EuiTab
            isSelected={selectedTab === 'data'}
            onClick={() => this.switchTab('data')}
          >
            <FormattedMessage
              id="tsvb.gauge.dataTab.dataButtonLabel"
              defaultMessage="Data"
            />
          </EuiTab>
          <EuiTab
            isSelected={selectedTab === 'options'}
            onClick={() => this.switchTab('options')}
          >
            <FormattedMessage
              id="tsvb.gauge.optionsTab.panelOptionsButtonLabel"
              defaultMessage="Panel options"
            />
          </EuiTab>
        </EuiTabs>
        {view}
      </div>
    );
  }

}

GaugePanelConfigUi.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func,
};

const GaugePanelConfig = injectI18n(GaugePanelConfigUi);
export default GaugePanelConfig;
