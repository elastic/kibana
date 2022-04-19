/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';
import { get } from 'lodash';
import uuid from 'uuid';
import {
  htmlIdGenerator,
  EuiTabs,
  EuiTab,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiFieldText,
  EuiTitle,
  EuiHorizontalRule,
  EuiCode,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { i18n } from '@kbn/i18n';
import { KBN_FIELD_TYPES } from '@kbn/data-plugin/public';
import { FieldSelect } from '../aggs/field_select';
// @ts-expect-error not typed yet
import { SeriesEditor } from '../series_editor';
// @ts-expect-error not typed yet
import { IndexPattern } from '../index_pattern';
import { YesNo } from '../yes_no';

import { QueryBarWrapper } from '../query_bar_wrapper';
import { getDefaultQueryLanguage } from '../lib/get_default_query_language';
import { VisDataContext } from '../../contexts/vis_data_context';
import { BUCKET_TYPES } from '../../../../common/enums';
import { PanelConfigProps, PANEL_CONFIG_TABS } from './types';
import { TimeseriesVisParams } from '../../../types';
import { getIndexPatternKey } from '../../../../common/index_patterns_utils';

export class TablePanelConfig extends Component<
  PanelConfigProps,
  { selectedTab: PANEL_CONFIG_TABS }
> {
  static contextType = VisDataContext;
  constructor(props: PanelConfigProps) {
    super(props);
    this.state = { selectedTab: PANEL_CONFIG_TABS.DATA };
  }

  UNSAFE_componentWillMount() {
    const { model } = this.props;
    if (!model.bar_color_rules || !model.bar_color_rules.length) {
      this.props.onChange({ bar_color_rules: [{ id: uuid.v1() }] });
    }
  }

  switchTab(selectedTab: PANEL_CONFIG_TABS) {
    this.setState({ selectedTab });
  }

  handlePivotChange = (selectedOptions: Array<string | null>) => {
    const { fields, model } = this.props;

    const getPivotType = (fieldName?: string | null): KBN_FIELD_TYPES | null => {
      const field = fields[getIndexPatternKey(model.index_pattern)].find(
        (f) => f.name === fieldName
      );
      return get(field, 'type', null);
    };

    this.props.onChange(
      selectedOptions.length === 1
        ? {
            pivot_id: selectedOptions[0] || undefined,
            pivot_type: getPivotType(selectedOptions[0]) || undefined,
          }
        : {
            pivot_id: selectedOptions,
            pivot_type: selectedOptions.map((item) => getPivotType(item)),
          }
    );
  };

  handleTextChange =
    (name: keyof TimeseriesVisParams) => (e: React.ChangeEvent<HTMLInputElement>) =>
      this.props.onChange({ [name]: e.target.value });

  render() {
    const { selectedTab } = this.state;
    const defaults = {
      drilldown_url: '',
      filter: { query: '', language: getDefaultQueryLanguage() },
      pivot_label: '',
      pivot_rows: 10,
      pivot_type: '',
    };
    const model = { ...defaults, ...this.props.model };
    const htmlId = htmlIdGenerator();
    const view =
      selectedTab === PANEL_CONFIG_TABS.DATA ? (
        <div>
          <div className="tvbPanelConfig__container">
            <EuiPanel>
              <EuiText>
                <p>
                  <FormattedMessage
                    id="visTypeTimeseries.table.dataTab.defineFieldDescription"
                    defaultMessage="For the table visualization you need to define a field to group by using a terms aggregation."
                  />
                </p>
              </EuiText>
              <EuiSpacer size="m" />

              <EuiFlexGroup responsive={false} wrap={true}>
                <EuiFlexItem data-test-subj="groupByField">
                  <FieldSelect
                    label={
                      <FormattedMessage
                        id="visTypeTimeseries.table.dataTab.groupByFieldLabel"
                        defaultMessage="Group by field"
                      />
                    }
                    restrict={[
                      KBN_FIELD_TYPES.NUMBER,
                      KBN_FIELD_TYPES.BOOLEAN,
                      KBN_FIELD_TYPES.DATE,
                      KBN_FIELD_TYPES.IP,
                      KBN_FIELD_TYPES.STRING,
                    ]}
                    fields={this.props.fields}
                    value={model.pivot_id}
                    indexPattern={model.index_pattern}
                    onChange={this.handlePivotChange}
                    uiRestrictions={this.context.uiRestrictions}
                    type={BUCKET_TYPES.TERMS}
                    allowMultiSelect={true}
                    fullWidth={true}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFormRow
                    id={htmlId('pivotLabelInput')}
                    label={
                      <FormattedMessage
                        id="visTypeTimeseries.table.dataTab.columnLabel"
                        defaultMessage="Column label"
                      />
                    }
                    fullWidth
                  >
                    <EuiFieldText
                      data-test-subj="columnLabelName"
                      onChange={this.handleTextChange('pivot_label')}
                      value={model.pivot_label ?? ''}
                      fullWidth
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFormRow
                    id={htmlId('pivotRowsInput')}
                    label={
                      <FormattedMessage
                        id="visTypeTimeseries.table.dataTab.rowsLabel"
                        defaultMessage="Rows"
                      />
                    }
                  >
                    {/*
                      EUITODO: The following input couldn't be converted to EUI because of type mis-match.
                      Should it be number or string?
                    */}
                    <input
                      className="tvbAgg__input"
                      type="number"
                      onChange={this.handleTextChange('pivot_rows')}
                      value={model.pivot_rows ?? ''}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </div>

          <SeriesEditor
            fields={this.props.fields}
            model={this.props.model}
            onChange={this.props.onChange}
          />
        </div>
      ) : (
        <div className="tvbPanelConfig__container">
          <EuiPanel>
            <EuiTitle size="s">
              <span>
                <FormattedMessage
                  id="visTypeTimeseries.table.optionsTab.dataLabel"
                  defaultMessage="Data"
                />
              </span>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiFormRow
              id={htmlId('drilldownInput')}
              label={
                <FormattedMessage
                  id="visTypeTimeseries.table.optionsTab.itemUrlLabel"
                  defaultMessage="Item url"
                />
              }
              helpText={
                <span>
                  <FormattedMessage
                    id="visTypeTimeseries.table.optionsTab.itemUrlHelpText"
                    defaultMessage="This supports mustache templating. {key} is set to the term."
                    values={{ key: <EuiCode>{'{{key}}'}</EuiCode> }}
                  />
                </span>
              }
            >
              <EuiFieldText
                onChange={this.handleTextChange('drilldown_url')}
                value={model.drilldown_url ?? ''}
                data-test-subj="drilldownUrl"
              />
            </EuiFormRow>

            <EuiHorizontalRule />

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
                  id={htmlId('panelFilterInput')}
                  label={
                    <FormattedMessage
                      id="visTypeTimeseries.table.optionsTab.panelFilterLabel"
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
                    'visTypeTimeseries.table.optionsTab.ignoreGlobalFilterLabel',
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
        </div>
      );

    return (
      <>
        <EuiTabs size="s">
          <EuiTab
            isSelected={selectedTab === PANEL_CONFIG_TABS.DATA}
            onClick={() => this.switchTab(PANEL_CONFIG_TABS.DATA)}
            data-test-subj="tableEditorDataBtn"
          >
            <FormattedMessage
              id="visTypeTimeseries.table.dataTab.columnsButtonLabel"
              defaultMessage="Columns"
            />
          </EuiTab>
          <EuiTab
            isSelected={selectedTab === PANEL_CONFIG_TABS.OPTIONS}
            onClick={() => this.switchTab(PANEL_CONFIG_TABS.OPTIONS)}
            data-test-subj="tableEditorPanelOptionsBtn"
          >
            <FormattedMessage
              id="visTypeTimeseries.table.optionsTab.panelOptionsButtonLabel"
              defaultMessage="Panel options"
            />
          </EuiTab>
        </EuiTabs>
        {view}
      </>
    );
  }
}
