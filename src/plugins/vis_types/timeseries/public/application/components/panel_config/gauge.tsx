/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import React, { Component } from 'react';
import uuid from 'uuid';
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
  EuiFieldNumber,
  EuiTitle,
  EuiHorizontalRule,
} from '@elastic/eui';

import type { Writable } from '@kbn/utility-types';

// @ts-ignore
import { SeriesEditor } from '../series_editor';
// @ts-expect-error not typed yet
import { IndexPattern } from '../index_pattern';
import { createSelectHandler } from '../lib/create_select_handler';
import { ColorRules } from '../color_rules';
import { ColorPicker } from '../color_picker';
import { QueryBarWrapper } from '../query_bar_wrapper';
import { getDefaultQueryLanguage } from '../lib/get_default_query_language';
import { YesNo } from '../yes_no';

import { limitOfSeries } from '../../../../common/ui_restrictions';
import { PANEL_TYPES } from '../../../../common/enums';
import { TimeseriesVisParams } from '../../../types';
import { PanelConfigProps, PANEL_CONFIG_TABS } from './types';

export class GaugePanelConfig extends Component<
  PanelConfigProps,
  { selectedTab: PANEL_CONFIG_TABS }
> {
  constructor(props: PanelConfigProps) {
    super(props);
    this.state = { selectedTab: PANEL_CONFIG_TABS.DATA };
  }

  UNSAFE_componentWillMount() {
    const { model } = this.props;
    const parts: Writable<Partial<TimeseriesVisParams>> = {};
    if (!model.gauge_color_rules || !model.gauge_color_rules.length) {
      parts.gauge_color_rules = [{ id: uuid.v1() }];
    }
    if (model.gauge_width == null) parts.gauge_width = 10;
    if (model.gauge_inner_width == null) parts.gauge_inner_width = 10;
    if (model.gauge_style == null) parts.gauge_style = 'half';
    this.props.onChange(parts);
  }

  switchTab(selectedTab: PANEL_CONFIG_TABS) {
    this.setState({ selectedTab });
  }

  handleTextChange =
    (name: keyof TimeseriesVisParams) => (e: React.ChangeEvent<HTMLInputElement>) =>
      this.props.onChange({ [name]: e.target.value });

  render() {
    const { selectedTab } = this.state;
    const defaults: Partial<TimeseriesVisParams> = {
      gauge_max: '',
      filter: { query: '', language: getDefaultQueryLanguage() },
      gauge_style: 'circle',
      gauge_inner_width: '',
      gauge_width: '',
    };
    const model = { ...defaults, ...this.props.model };
    const handleSelectChange = createSelectHandler(this.props.onChange);
    const styleOptions = [
      {
        label: i18n.translate('visTypeTimeseries.gauge.styleOptions.circleLabel', {
          defaultMessage: 'Circle',
        }),
        value: 'circle',
      },
      {
        label: i18n.translate('visTypeTimeseries.gauge.styleOptions.halfCircleLabel', {
          defaultMessage: 'Half Circle',
        }),
        value: 'half',
      },
    ];
    const htmlId = htmlIdGenerator();
    const selectedGaugeStyleOption = styleOptions.find(
      (option) => model.gauge_style === option.value
    );
    const view =
      selectedTab === PANEL_CONFIG_TABS.DATA ? (
        <SeriesEditor
          colorPicker={true}
          fields={this.props.fields}
          limit={limitOfSeries[PANEL_TYPES.GAUGE]}
          model={this.props.model}
          onChange={this.props.onChange}
        />
      ) : (
        <div className="tvbPanelConfig__container">
          <EuiPanel>
            <EuiTitle size="s">
              <span>
                <FormattedMessage
                  id="visTypeTimeseries.gauge.optionsTab.dataLabel"
                  defaultMessage="Data"
                />
              </span>
            </EuiTitle>
            <EuiSpacer size="m" />

            <IndexPattern
              fields={this.props.fields}
              model={this.props.model}
              onChange={this.props.onChange}
              allowIndexSwitchingMode={true}
            />

            <EuiHorizontalRule />

            <EuiFlexGroup responsive={false} wrap={true}>
              <EuiFlexItem>
                <EuiFormRow
                  id={htmlId('panelFilter')}
                  label={
                    <FormattedMessage
                      id="visTypeTimeseries.gauge.optionsTab.panelFilterLabel"
                      defaultMessage="Panel filter"
                    />
                  }
                  fullWidth
                >
                  <QueryBarWrapper
                    query={{
                      language: model.filter?.language || getDefaultQueryLanguage(),
                      query: model.filter?.query || '',
                    }}
                    onChange={(filter) => {
                      this.props.onChange({ filter });
                    }}
                    indexPatterns={[model.index_pattern]}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormRow
                  label={i18n.translate(
                    'visTypeTimeseries.gauge.optionsTab.ignoreGlobalFilterLabel',
                    {
                      defaultMessage: 'Ignore global filter?',
                    }
                  )}
                >
                  <YesNo
                    value={model.ignore_global_filter}
                    name="ignore_global_filter"
                    onChange={this.props.onChange}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>

          <EuiSpacer />

          <EuiPanel>
            <EuiTitle size="s">
              <span>
                <FormattedMessage
                  id="visTypeTimeseries.gauge.optionsTab.styleLabel"
                  defaultMessage="Style"
                />
              </span>
            </EuiTitle>
            <EuiSpacer size="m" />

            <EuiFlexGroup responsive={false} wrap={true}>
              <EuiFlexItem>
                <EuiFormRow
                  id={htmlId('gaugeMax')}
                  label={
                    <FormattedMessage
                      id="visTypeTimeseries.gauge.optionsTab.gaugeMaxLabel"
                      defaultMessage="Gauge max (empty for auto)"
                    />
                  }
                >
                  <EuiFieldNumber
                    onChange={this.handleTextChange('gauge_max')}
                    value={model.gauge_max}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  id={htmlId('gaugeStyle')}
                  label={
                    <FormattedMessage
                      id="visTypeTimeseries.gauge.optionsTab.gaugeStyleLabel"
                      defaultMessage="Gauge style"
                    />
                  }
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
                  label={
                    <FormattedMessage
                      id="visTypeTimeseries.gauge.optionsTab.innerLineWidthLabel"
                      defaultMessage="Inner line width"
                    />
                  }
                >
                  <EuiFieldNumber
                    onChange={this.handleTextChange('gauge_inner_width')}
                    value={Number(model.gauge_inner_width)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  id={htmlId('gaugeLine')}
                  label={
                    <FormattedMessage
                      id="visTypeTimeseries.gauge.optionsTab.gaugeLineWidthLabel"
                      defaultMessage="Gauge line width"
                    />
                  }
                >
                  <EuiFieldNumber
                    onChange={this.handleTextChange('gauge_width')}
                    value={Number(model.gauge_width)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiHorizontalRule />

            <EuiFlexGroup responsive={false} wrap={true} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiFormLabel>
                  <FormattedMessage
                    id="visTypeTimeseries.gauge.optionsTab.backgroundColorLabel"
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
                <EuiFormLabel>
                  <FormattedMessage
                    id="visTypeTimeseries.gauge.optionsTab.innerColorLabel"
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
                  id="visTypeTimeseries.gauge.optionsTab.colorRulesLabel"
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

    return (
      <>
        <EuiTabs size="s">
          <EuiTab
            isSelected={selectedTab === PANEL_CONFIG_TABS.DATA}
            onClick={() => this.switchTab(PANEL_CONFIG_TABS.DATA)}
            data-test-subj="gaugeEditorDataBtn"
          >
            <FormattedMessage
              id="visTypeTimeseries.gauge.dataTab.dataButtonLabel"
              defaultMessage="Data"
            />
          </EuiTab>
          <EuiTab
            isSelected={selectedTab === PANEL_CONFIG_TABS.OPTIONS}
            onClick={() => this.switchTab(PANEL_CONFIG_TABS.OPTIONS)}
            data-test-subj="gaugeEditorPanelOptionsBtn"
          >
            <FormattedMessage
              id="visTypeTimeseries.gauge.optionsTab.panelOptionsButtonLabel"
              defaultMessage="Panel options"
            />
          </EuiTab>
        </EuiTabs>
        {view}
      </>
    );
  }
}
