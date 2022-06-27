/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import React, { Component } from 'react';
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
  EuiFieldNumber,
} from '@elastic/eui';

// @ts-expect-error not typed yet
import { SeriesEditor } from '../series_editor';
// @ts-expect-error not typed yet
import { IndexPattern } from '../index_pattern';
import { AnnotationsEditor } from '../annotations_editor';
import { createSelectHandler } from '../lib/create_select_handler';
import { ColorPicker } from '../color_picker';
import { YesNo } from '../yes_no';
import { getDefaultQueryLanguage } from '../lib/get_default_query_language';
import { QueryBarWrapper } from '../query_bar_wrapper';
import { PanelConfigProps, PANEL_CONFIG_TABS } from './types';
import { TimeseriesVisParams } from '../../../types';
import { TOOLTIP_MODES } from '../../../../common/enums';

const positionOptions = [
  {
    label: i18n.translate('visTypeTimeseries.timeseries.positionOptions.rightLabel', {
      defaultMessage: 'Right',
    }),
    value: 'right',
  },
  {
    label: i18n.translate('visTypeTimeseries.timeseries.positionOptions.leftLabel', {
      defaultMessage: 'Left',
    }),
    value: 'left',
  },
];
const tooltipModeOptions = [
  {
    label: i18n.translate('visTypeTimeseries.timeseries.tooltipOptions.showAll', {
      defaultMessage: 'Show all values',
    }),
    value: 'show_all',
  },
  {
    label: i18n.translate('visTypeTimeseries.timeseries.tooltipOptions.showFocused', {
      defaultMessage: 'Show focused values',
    }),
    value: 'show_focused',
  },
];
const scaleOptions = [
  {
    label: i18n.translate('visTypeTimeseries.timeseries.scaleOptions.normalLabel', {
      defaultMessage: 'Normal',
    }),
    value: 'normal',
  },
  {
    label: i18n.translate('visTypeTimeseries.timeseries.scaleOptions.logLabel', {
      defaultMessage: 'Log',
    }),
    value: 'log',
  },
];
const legendPositionOptions = [
  {
    label: i18n.translate('visTypeTimeseries.timeseries.legendPositionOptions.rightLabel', {
      defaultMessage: 'Right',
    }),
    value: 'right',
  },
  {
    label: i18n.translate('visTypeTimeseries.timeseries.legendPositionOptions.leftLabel', {
      defaultMessage: 'Left',
    }),
    value: 'left',
  },
  {
    label: i18n.translate('visTypeTimeseries.timeseries.legendPositionOptions.bottomLabel', {
      defaultMessage: 'Bottom',
    }),
    value: 'bottom',
  },
];

const MAX_TRUNCATE_LINES = 5;
const MIN_TRUNCATE_LINES = 1;

export class TimeseriesPanelConfig extends Component<
  PanelConfigProps,
  { selectedTab: PANEL_CONFIG_TABS }
> {
  constructor(props: PanelConfigProps) {
    super(props);
    this.state = { selectedTab: PANEL_CONFIG_TABS.DATA };
  }

  switchTab(selectedTab: PANEL_CONFIG_TABS) {
    this.setState({ selectedTab });
  }

  handleTextChange =
    (name: keyof TimeseriesVisParams) => (e: React.ChangeEvent<HTMLInputElement>) =>
      this.props.onChange({ [name]: e.target.value });

  render() {
    const defaults = {
      filter: { query: '', language: getDefaultQueryLanguage() },
      axis_max: '',
      axis_min: '',
      legend_position: 'right',
      show_grid: 1,
      tooltip_mode: TOOLTIP_MODES.SHOW_ALL,
      ignore_daylight_time: false,
    };
    const model = { ...defaults, ...this.props.model };
    const { selectedTab } = this.state;
    const handleSelectChange = createSelectHandler(this.props.onChange);
    const htmlId = htmlIdGenerator();

    const selectedPositionOption = positionOptions.find(
      (option) => model.axis_position === option.value
    );
    const selectedAxisScaleOption = scaleOptions.find(
      (option) => model.axis_scale === option.value
    );
    const selectedLegendPosOption = legendPositionOptions.find(
      (option) => model.legend_position === option.value
    );
    const selectedTooltipMode = tooltipModeOptions.find(
      (option) => model.tooltip_mode === option.value
    );

    let view;
    if (selectedTab === PANEL_CONFIG_TABS.DATA) {
      view = (
        <SeriesEditor
          fields={this.props.fields}
          model={this.props.model}
          onChange={this.props.onChange}
        />
      );
    } else if (selectedTab === PANEL_CONFIG_TABS.ANNOTATIONS) {
      view = (
        <AnnotationsEditor
          fields={this.props.fields}
          model={this.props.model}
          onChange={this.props.onChange}
          defaultIndexPattern={this.props.defaultIndexPattern}
        />
      );
    } else {
      view = (
        <div className="tvbPanelConfig__container">
          <EuiPanel>
            <EuiTitle size="s">
              <span>
                <FormattedMessage
                  id="visTypeTimeseries.timeseries.optionsTab.dataLabel"
                  defaultMessage="Data"
                />
              </span>
            </EuiTitle>
            <EuiSpacer size="m" />

            <IndexPattern
              fields={this.props.fields}
              model={this.props.model}
              onChange={this.props.onChange}
              allowLevelOfDetail={true}
              allowIndexSwitchingMode={true}
            />
            <EuiHorizontalRule />

            <EuiFlexGroup responsive={false} wrap={true}>
              <EuiFlexItem>
                <EuiFormRow
                  id={htmlId('panelFilter')}
                  label={
                    <FormattedMessage
                      id="visTypeTimeseries.timeseries.optionsTab.panelFilterLabel"
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
                    data-test-subj="panelFilterQueryBar"
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormRow
                  label={i18n.translate(
                    'visTypeTimeseries.timeseries.optionsTab.ignoreGlobalFilterLabel',
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
              <EuiFlexItem grow={false}>
                <EuiFormRow
                  label={i18n.translate(
                    'visTypeTimeseries.timeseries.optionsTab.ignoreDaylightTimeLabel',
                    {
                      defaultMessage: 'Ignore daylight time?',
                    }
                  )}
                >
                  <YesNo
                    value={model.ignore_daylight_time}
                    name="ignore_daylight_time"
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
                  id="visTypeTimeseries.timeseries.optionsTab.styleLabel"
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
                      id="visTypeTimeseries.timeseries.optionsTab.axisMinLabel"
                      defaultMessage="Axis min"
                    />
                  }
                >
                  <EuiFieldText
                    onChange={this.handleTextChange('axis_min')}
                    value={model.axis_min ?? ''}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  id={htmlId('axisMax')}
                  label={
                    <FormattedMessage
                      id="visTypeTimeseries.timeseries.optionsTab.axisMaxLabel"
                      defaultMessage="Axis max"
                    />
                  }
                >
                  <EuiFieldText
                    onChange={this.handleTextChange('axis_max')}
                    value={model.axis_max ?? ''}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  id={htmlId('axisPos')}
                  label={
                    <FormattedMessage
                      id="visTypeTimeseries.timeseries.optionsTab.axisPositionLabel"
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
                      id="visTypeTimeseries.timeseries.optionsTab.axisScaleLabel"
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
                <EuiFormLabel>
                  <FormattedMessage
                    id="visTypeTimeseries.timeseries.optionsTab.backgroundColorLabel"
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
                    id="visTypeTimeseries.timeseries.optionsTab.displayGridLabel"
                    defaultMessage="Display grid"
                  />
                </EuiFormLabel>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <YesNo value={model.show_grid} name="show_grid" onChange={this.props.onChange} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormLabel>
                  <FormattedMessage
                    id="visTypeTimeseries.timeseries.optionsTab.tooltipMode"
                    defaultMessage="Tooltip"
                  />
                </EuiFormLabel>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiComboBox
                  isClearable={false}
                  id={htmlId('tooltipMode')}
                  options={tooltipModeOptions}
                  selectedOptions={selectedTooltipMode ? [selectedTooltipMode] : []}
                  onChange={handleSelectChange('tooltip_mode')}
                  singleSelection={{ asPlainText: true }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexGroup responsive={false} wrap={true} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiFormLabel>
                  <FormattedMessage
                    id="visTypeTimeseries.timeseries.optionsTab.showLegendLabel"
                    defaultMessage="Show legend?"
                  />
                </EuiFormLabel>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <YesNo
                  value={model.show_legend}
                  name="show_legend"
                  onChange={this.props.onChange}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormLabel>
                  <FormattedMessage
                    id="visTypeTimeseries.timeseries.optionsTab.truncateLegendLabel"
                    defaultMessage="Truncate legend?"
                  />
                </EuiFormLabel>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <YesNo
                  value={model.truncate_legend}
                  name="truncate_legend"
                  onChange={this.props.onChange}
                  data-test-subj="timeSeriesEditorDataTruncateLegendSwitch"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormLabel>
                  <FormattedMessage
                    id="visTypeTimeseries.timeseries.optionsTab.maxLinesLabel"
                    defaultMessage="Maximum legend lines"
                  />
                </EuiFormLabel>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFieldNumber
                  data-test-subj="timeSeriesEditorDataMaxLegendLines"
                  value={model.max_lines_legend}
                  min={MIN_TRUNCATE_LINES}
                  max={MAX_TRUNCATE_LINES}
                  compressed
                  disabled={!Boolean(model.truncate_legend)}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    this.props.onChange({
                      max_lines_legend: Math.min(
                        MAX_TRUNCATE_LINES,
                        Math.max(val, MIN_TRUNCATE_LINES)
                      ),
                    });
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormLabel htmlFor={htmlId('legendPos')}>
                  <FormattedMessage
                    id="visTypeTimeseries.timeseries.optionsTab.legendPositionLabel"
                    defaultMessage="Legend position"
                  />
                </EuiFormLabel>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiComboBox
                  isClearable={false}
                  id={htmlId('legendPos')}
                  options={legendPositionOptions}
                  selectedOptions={selectedLegendPosOption ? [selectedLegendPosOption] : []}
                  onChange={handleSelectChange('legend_position')}
                  singleSelection={{ asPlainText: true }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </div>
      );
    }
    return (
      <>
        <EuiTabs size="s">
          <EuiTab
            isSelected={selectedTab === PANEL_CONFIG_TABS.DATA}
            onClick={() => this.switchTab(PANEL_CONFIG_TABS.DATA)}
            data-test-subj="timeSeriesEditorDataBtn"
          >
            <FormattedMessage
              id="visTypeTimeseries.timeseries.dataTab.dataButtonLabel"
              defaultMessage="Data"
            />
          </EuiTab>
          <EuiTab
            isSelected={selectedTab === PANEL_CONFIG_TABS.OPTIONS}
            onClick={() => this.switchTab(PANEL_CONFIG_TABS.OPTIONS)}
            data-test-subj="timeSeriesEditorPanelOptionsBtn"
          >
            <FormattedMessage
              id="visTypeTimeseries.timeseries.optionsTab.panelOptionsButtonLabel"
              defaultMessage="Panel options"
            />
          </EuiTab>
          <EuiTab
            isSelected={selectedTab === PANEL_CONFIG_TABS.ANNOTATIONS}
            onClick={() => this.switchTab(PANEL_CONFIG_TABS.ANNOTATIONS)}
            data-test-subj="timeSeriesEditorAnnotationsBtn"
          >
            <FormattedMessage
              id="visTypeTimeseries.timeseries.annotationsTab.annotationsButtonLabel"
              defaultMessage="Annotations"
            />
          </EuiTab>
        </EuiTabs>
        {view}
      </>
    );
  }
}
