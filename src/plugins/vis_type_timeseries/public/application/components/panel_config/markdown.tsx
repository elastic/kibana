/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
  EuiTitle,
  EuiHorizontalRule,
  EuiCodeEditor,
} from '@elastic/eui';
// @ts-expect-error
import less from 'less/lib/less-browser';
import 'brace/mode/less';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import type { Writable } from '@kbn/utility-types';

// @ts-expect-error not typed yet
import { SeriesEditor } from '../series_editor';
// @ts-ignore should be typed after https://github.com/elastic/kibana/pull/92812 to reduce conflicts
import { IndexPattern } from '../index_pattern';
import { createSelectHandler } from '../lib/create_select_handler';
import { ColorPicker } from '../color_picker';
import { YesNo } from '../yes_no';
// @ts-expect-error not typed yet
import { MarkdownEditor } from '../markdown_editor';
// @ts-ignore this is typed in https://github.com/elastic/kibana/pull/92812, remove ignore after merging
import { QueryBarWrapper } from '../query_bar_wrapper';
import { getDefaultQueryLanguage } from '../lib/get_default_query_language';
import { VisDataContext } from '../../contexts/vis_data_context';
import { PanelConfigProps, PANEL_CONFIG_TABS } from './types';
import { TimeseriesVisParams } from '../../../types';

const lessC = less(window, { env: 'production' });

export class MarkdownPanelConfig extends Component<
  PanelConfigProps,
  { selectedTab: PANEL_CONFIG_TABS }
> {
  constructor(props: PanelConfigProps) {
    super(props);
    this.state = { selectedTab: PANEL_CONFIG_TABS.MARKDOWN };
    this.handleCSSChange = this.handleCSSChange.bind(this);
  }

  switchTab(selectedTab: PANEL_CONFIG_TABS) {
    this.setState({ selectedTab });
  }

  handleCSSChange(value: string) {
    const { model } = this.props;
    const lessSrc = `#markdown-${model.id} {${value}}`;
    lessC.render(
      lessSrc,
      { compress: true, javascriptEnabled: false },
      (e: unknown, output: any) => {
        const parts: Writable<Pick<TimeseriesVisParams, 'markdown_less' | 'markdown_css'>> = {
          markdown_less: value,
        };
        if (output) {
          parts.markdown_css = output.css;
        }
        this.props.onChange(parts);
      }
    );
  }

  render() {
    const defaults = { filter: { query: '', language: getDefaultQueryLanguage() } };
    const model = { ...defaults, ...this.props.model };
    const { selectedTab } = this.state;
    const handleSelectChange = createSelectHandler(this.props.onChange);
    const htmlId = htmlIdGenerator();

    const alignOptions = [
      {
        label: i18n.translate('visTypeTimeseries.markdown.alignOptions.topLabel', {
          defaultMessage: 'Top',
        }),
        value: 'top',
      },
      {
        label: i18n.translate('visTypeTimeseries.markdown.alignOptions.middleLabel', {
          defaultMessage: 'Middle',
        }),
        value: 'middle',
      },
      {
        label: i18n.translate('visTypeTimeseries.markdown.alignOptions.bottomLabel', {
          defaultMessage: 'Bottom',
        }),
        value: 'bottom',
      },
    ];
    const selectedAlignOption = alignOptions.find((option) => {
      return model.markdown_vertical_align === option.value;
    });
    let view;
    if (selectedTab === PANEL_CONFIG_TABS.MARKDOWN) {
      view = (
        <VisDataContext.Consumer>
          {(visData) => <MarkdownEditor visData={visData} {...this.props} />}
        </VisDataContext.Consumer>
      );
    } else if (selectedTab === PANEL_CONFIG_TABS.DATA) {
      view = (
        <SeriesEditor
          colorPicker={false}
          fields={this.props.fields}
          model={this.props.model}
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
                  id="visTypeTimeseries.markdown.optionsTab.dataLabel"
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
                  label={
                    <FormattedMessage
                      id="visTypeTimeseries.markdown.optionsTab.panelFilterLabel"
                      defaultMessage="Panel filter"
                    />
                  }
                  fullWidth
                >
                  <QueryBarWrapper
                    query={{
                      language: model.filter.language || getDefaultQueryLanguage(),
                      query: model.filter.query || '',
                    }}
                    onChange={(filter: PanelConfigProps['model']['filter']) =>
                      this.props.onChange({ filter })
                    }
                    indexPatterns={[model.index_pattern || model.default_index_pattern]}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormLabel>
                  <FormattedMessage
                    id="visTypeTimeseries.markdown.optionsTab.ignoreGlobalFilterLabel"
                    defaultMessage="Ignore global filter?"
                  />
                </EuiFormLabel>
                <EuiSpacer size="m" />
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
                  id="visTypeTimeseries.markdown.optionsTab.styleLabel"
                  defaultMessage="Style"
                />
              </span>
            </EuiTitle>
            <EuiSpacer size="m" />

            <EuiFlexGroup responsive={false} wrap={true} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiFormLabel>
                  <FormattedMessage
                    id="visTypeTimeseries.markdown.optionsTab.backgroundColorLabel"
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
                <EuiFormLabel>
                  <FormattedMessage
                    id="visTypeTimeseries.markdown.optionsTab.showScrollbarsLabel"
                    defaultMessage="Show scrollbars?"
                  />
                </EuiFormLabel>
              </EuiFlexItem>
              <EuiFlexItem>
                <YesNo
                  value={model.markdown_scrollbars}
                  name="markdown_scrollbars"
                  onChange={this.props.onChange}
                />
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiFormLabel>
                  <FormattedMessage
                    id="visTypeTimeseries.markdown.optionsTab.openLinksInNewTab"
                    defaultMessage="Open links in new tab?"
                  />
                </EuiFormLabel>
              </EuiFlexItem>
              <EuiFlexItem>
                <YesNo
                  value={model.markdown_openLinksInNewTab}
                  name="markdown_openLinksInNewTab"
                  onChange={this.props.onChange}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormLabel htmlFor={htmlId('valign')}>
                  <FormattedMessage
                    id="visTypeTimeseries.markdown.optionsTab.verticalAlignmentLabel"
                    defaultMessage="Vertical alignment:"
                  />
                </EuiFormLabel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiComboBox
                  id={htmlId('valign')}
                  isClearable={false}
                  options={alignOptions}
                  selectedOptions={selectedAlignOption ? [selectedAlignOption] : []}
                  onChange={handleSelectChange('markdown_vertical_align')}
                  singleSelection={{ asPlainText: true }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiHorizontalRule />

            <EuiTitle size="xxs">
              <span>
                <FormattedMessage
                  id="visTypeTimeseries.markdown.optionsTab.customCSSLabel"
                  defaultMessage="Custom CSS (supports Less)"
                  description="CSS and Less are names of technologies and should not be translated."
                />
              </span>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiCodeEditor
              mode="less"
              theme="github"
              width="100%"
              name={`ace-css-${model.id}`}
              setOptions={{ fontSize: '14px' }}
              value={model.markdown_less ?? ''}
              onChange={this.handleCSSChange}
            />
          </EuiPanel>
        </div>
      );
    }
    return (
      <>
        <EuiTabs size="s">
          <EuiTab
            isSelected={selectedTab === PANEL_CONFIG_TABS.MARKDOWN}
            onClick={() => this.switchTab(PANEL_CONFIG_TABS.MARKDOWN)}
            data-test-subj="markdown-subtab"
          >
            Markdown
          </EuiTab>
          <EuiTab
            data-test-subj="data-subtab"
            isSelected={selectedTab === PANEL_CONFIG_TABS.DATA}
            onClick={() => this.switchTab(PANEL_CONFIG_TABS.DATA)}
          >
            <FormattedMessage
              id="visTypeTimeseries.markdown.dataTab.dataButtonLabel"
              defaultMessage="Data"
            />
          </EuiTab>
          <EuiTab
            isSelected={selectedTab === PANEL_CONFIG_TABS.OPTIONS}
            onClick={() => this.switchTab(PANEL_CONFIG_TABS.OPTIONS)}
            data-test-subj="options-subtab"
          >
            <FormattedMessage
              id="visTypeTimeseries.markdown.optionsTab.panelOptionsButtonLabel"
              defaultMessage="Panel options"
            />
          </EuiTab>
        </EuiTabs>
        {view}
      </>
    );
  }
}
