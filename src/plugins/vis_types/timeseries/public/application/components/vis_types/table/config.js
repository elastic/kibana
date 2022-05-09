/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import uuid from 'uuid';
import { i18n } from '@kbn/i18n';
import { last } from 'lodash';

import { DataFormatPicker } from '../../data_format_picker';
import { createSelectHandler } from '../../lib/create_select_handler';
import { createTextHandler } from '../../lib/create_text_handler';
import { FieldSelect } from '../../aggs/field_select';
import { YesNo } from '../../yes_no';
import { ColorRules } from '../../color_rules';
import {
  htmlIdGenerator,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiFormRow,
  EuiCode,
  EuiHorizontalRule,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { getDefaultQueryLanguage } from '../../lib/get_default_query_language';
import { checkIfNumericMetric } from '../../lib/check_if_numeric_metric';
import { QueryBarWrapper } from '../../query_bar_wrapper';
import { DATA_FORMATTERS } from '../../../../../common/enums';
import { isConfigurationFeatureEnabled } from '../../../../../common/check_ui_restrictions';
import { filterCannotBeAppliedErrorMessage } from '../../../../../common/errors';
import { KBN_FIELD_TYPES } from '@kbn/data-plugin/public';

export class TableSeriesConfig extends Component {
  UNSAFE_componentWillMount() {
    const { model } = this.props;
    if (!model.color_rules || (model.color_rules && model.color_rules.length === 0)) {
      this.props.onChange({
        color_rules: [{ id: uuid.v1() }],
      });
    }
  }

  changeModelFormatter = (formatter) => this.props.onChange({ formatter });

  render() {
    const defaults = { offset_time: '', value_template: '{{value}}' };
    const model = { ...defaults, ...this.props.model };
    const handleSelectChange = createSelectHandler(this.props.onChange);
    const handleTextChange = createTextHandler(this.props.onChange);
    const htmlId = htmlIdGenerator();

    const functionOptions = [
      {
        label: i18n.translate('visTypeTimeseries.table.sumLabel', {
          defaultMessage: 'Sum',
        }),
        value: 'sum',
      },
      {
        label: i18n.translate('visTypeTimeseries.table.maxLabel', {
          defaultMessage: 'Max',
        }),
        value: 'max',
      },
      {
        label: i18n.translate('visTypeTimeseries.table.minLabel', {
          defaultMessage: 'Min',
        }),
        value: 'min',
      },
      {
        label: i18n.translate('visTypeTimeseries.table.avgLabel', {
          defaultMessage: 'Avg',
        }),
        value: 'mean',
      },
      {
        label: i18n.translate('visTypeTimeseries.table.overallSumLabel', {
          defaultMessage: 'Overall Sum',
        }),
        value: 'overall_sum',
      },
      {
        label: i18n.translate('visTypeTimeseries.table.overallMaxLabel', {
          defaultMessage: 'Overall Max',
        }),
        value: 'overall_max',
      },
      {
        label: i18n.translate('visTypeTimeseries.table.overallMinLabel', {
          defaultMessage: 'Overall Min',
        }),
        value: 'overall_min',
      },
      {
        label: i18n.translate('visTypeTimeseries.table.overallAvgLabel', {
          defaultMessage: 'Overall Avg',
        }),
        value: 'overall_avg',
      },
      {
        label: i18n.translate('visTypeTimeseries.table.cumulativeSumLabel', {
          defaultMessage: 'Cumulative Sum',
        }),
        value: 'cumulative_sum',
      },
    ];
    const selectedAggFuncOption = functionOptions.find((option) => {
      return model.aggregate_function === option.value;
    });

    const isNumericMetric = checkIfNumericMetric(
      last(model.metrics),
      this.props.fields,
      this.props.indexPatternForQuery
    );
    const isKibanaIndexPattern =
      this.props.panel.use_kibana_indexes || this.props.indexPatternForQuery === '';

    const isFilterCannotBeApplied =
      model.filter?.query && !isConfigurationFeatureEnabled('filter', this.props.uiRestrictions);

    return (
      <div className="tvbAggRow">
        <EuiFlexGroup gutterSize="s">
          <DataFormatPicker
            formatterValue={model.formatter}
            changeModelFormatter={this.changeModelFormatter}
            shouldIncludeDefaultOption={isKibanaIndexPattern}
            shouldIncludeNumberOptions={isNumericMetric}
          />
          <EuiFlexItem grow={3}>
            <EuiFormRow
              id={htmlId('template')}
              label={
                <FormattedMessage
                  id="visTypeTimeseries.table.templateLabel"
                  defaultMessage="Template"
                />
              }
              helpText={
                <span>
                  <FormattedMessage
                    id="visTypeTimeseries.table.templateHelpText"
                    defaultMessage="eg.{templateExample}"
                    values={{ templateExample: <EuiCode>{'{{value}}/s'}</EuiCode> }}
                  />
                </span>
              }
              fullWidth
            >
              <EuiFieldText
                onChange={handleTextChange('value_template')}
                value={model.value_template}
                disabled={model.formatter === DATA_FORMATTERS.DEFAULT}
                fullWidth
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiHorizontalRule margin="s" />

        <EuiFlexGroup responsive={false} wrap={true}>
          <EuiFlexItem grow={true}>
            <EuiFormRow
              id={htmlId('filterInput')}
              label={
                <FormattedMessage
                  id="visTypeTimeseries.table.filterLabel"
                  defaultMessage="Filter"
                />
              }
              isInvalid={isFilterCannotBeApplied}
              error={filterCannotBeAppliedErrorMessage}
              fullWidth
            >
              <QueryBarWrapper
                query={{
                  language: model?.filter?.language || getDefaultQueryLanguage(),
                  query: model?.filter?.query || '',
                }}
                isInvalid={isFilterCannotBeApplied}
                onChange={(filter) => this.props.onChange({ filter })}
                indexPatterns={[this.props.indexPatternForQuery]}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow
              label={i18n.translate('visTypeTimeseries.table.showTrendArrowsLabel', {
                defaultMessage: 'Show trend arrows?',
              })}
            >
              <YesNo
                value={model.trend_arrows}
                name="trend_arrows"
                onChange={this.props.onChange}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiHorizontalRule margin="s" />

        <EuiFlexGroup responsive={false} wrap={true}>
          <EuiFlexItem grow={true}>
            <FieldSelect
              label={
                <FormattedMessage id="visTypeTimeseries.table.fieldLabel" defaultMessage="Field" />
              }
              fields={this.props.fields}
              indexPattern={this.props.panel.index_pattern}
              value={model.aggregate_by}
              onChange={(value) =>
                this.props.onChange({
                  aggregate_by: value?.[0],
                })
              }
              fullWidth
              restrict={[
                KBN_FIELD_TYPES.NUMBER,
                KBN_FIELD_TYPES.BOOLEAN,
                KBN_FIELD_TYPES.DATE,
                KBN_FIELD_TYPES.IP,
                KBN_FIELD_TYPES.STRING,
              ]}
              uiRestrictions={this.props.uiRestrictions}
              type={'terms'}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <EuiFormRow
              id={htmlId('aggregateFunctionInput')}
              label={
                <FormattedMessage
                  id="visTypeTimeseries.table.aggregateFunctionLabel"
                  defaultMessage="Aggregate function"
                />
              }
              fullWidth
            >
              <EuiComboBox
                options={functionOptions}
                selectedOptions={selectedAggFuncOption ? [selectedAggFuncOption] : []}
                onChange={handleSelectChange('aggregate_function')}
                singleSelection={{ asPlainText: true }}
                fullWidth
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiHorizontalRule margin="s" />

        <EuiTitle size="xxs">
          <span>
            <FormattedMessage
              id="visTypeTimeseries.table.colorRulesLabel"
              defaultMessage="Color rules"
            />
          </span>
        </EuiTitle>
        <EuiSpacer size="s" />

        <ColorRules
          primaryName="text"
          primaryVarName="text"
          hideSecondary={true}
          model={model}
          onChange={this.props.onChange}
          name="color_rules"
        />
      </div>
    );
  }
}

TableSeriesConfig.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func,
  indexPatternForQuery: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
  uiRestrictions: PropTypes.object,
};
