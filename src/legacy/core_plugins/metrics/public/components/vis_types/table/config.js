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

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import uuid from 'uuid';
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
  EuiFormLabel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

class TableSeriesConfigUI extends Component {

  componentWillMount() {
    const { model } = this.props;
    if (!model.color_rules || (model.color_rules && model.color_rules.length === 0)) {
      this.props.onChange({
        color_rules: [{ id: uuid.v1() }]
      });
    }
  }

  render() {
    const defaults = { offset_time: '', value_template: '' };
    const model = { ...defaults, ...this.props.model };
    const handleSelectChange = createSelectHandler(this.props.onChange);
    const handleTextChange = createTextHandler(this.props.onChange);
    const htmlId = htmlIdGenerator();
    const { intl } = this.props;

    const functionOptions = [
      { label: intl.formatMessage({ id: 'tsvb.table.sumLabel', defaultMessage: 'Sum' }), value: 'sum' },
      { label: intl.formatMessage({ id: 'tsvb.table.maxLabel', defaultMessage: 'Max' }), value: 'max' },
      { label: intl.formatMessage({ id: 'tsvb.table.minLabel', defaultMessage: 'Min' }), value: 'min' },
      { label: intl.formatMessage({ id: 'tsvb.table.avgLabel', defaultMessage: 'Avg' }), value: 'mean' },
      { label: intl.formatMessage({ id: 'tsvb.table.overallSumLabel', defaultMessage: 'Overall Sum' }), value: 'overall_sum' },
      { label: intl.formatMessage({ id: 'tsvb.table.overallMaxLabel', defaultMessage: 'Overall Max' }), value: 'overall_max' },
      { label: intl.formatMessage({ id: 'tsvb.table.overallMinLabel', defaultMessage: 'Overall Min' }), value: 'overall_min' },
      { label: intl.formatMessage({ id: 'tsvb.table.overallAvgLabel', defaultMessage: 'Overall Avg' }), value: 'overall_avg' },
      { label: intl.formatMessage({ id: 'tsvb.table.cumulativeSumLabel', defaultMessage: 'Cumulative Sum' }), value: 'cumulative_sum' },
    ];
    const selectedAggFuncOption = functionOptions.find(option => {
      return model.aggregate_function === option.value;
    });

    return (
      <div className="tvbAggRow">

        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <DataFormatPicker
              onChange={handleSelectChange('formatter')}
              value={model.formatter}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              id={htmlId('template')}
              label={(<FormattedMessage
                id="tsvb.table.templateLabel"
                defaultMessage="Template"
              />)}
              helpText={
                <span>
                  <FormattedMessage
                    id="tsvb.table.templateHelpText"
                    defaultMessage="eg.{templateExample}"
                    values={{ templateExample: (<EuiCode>{'{{value}}/s'}</EuiCode>) }}
                  />
                </span>
              }
              fullWidth
            >
              <EuiFieldText
                onChange={handleTextChange('value_template')}
                value={model.value_template}
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
              label={(<FormattedMessage
                id="tsvb.table.filterLabel"
                defaultMessage="Filter"
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
                id="tsvb.table.showTrendArrowsLabel"
                defaultMessage="Show trend arrows?"
              />
            </EuiFormLabel>
            <EuiSpacer size="s" />
            <YesNo
              value={model.trend_arrows}
              name="trend_arrows"
              onChange={this.props.onChange}
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiHorizontalRule margin="s" />

        <EuiFlexGroup responsive={false} wrap={true}>
          <EuiFlexItem grow={true}>
            <EuiFormRow
              id={htmlId('field')}
              label={(<FormattedMessage
                id="tsvb.table.fieldLabel"
                defaultMessage="Field"
              />)}
            >
              <FieldSelect
                fields={this.props.fields}
                indexPattern={this.props.panel.index_pattern}
                value={model.aggregate_by}
                onChange={handleSelectChange('aggregate_by')}
                fullWidth
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <EuiFormRow
              id={htmlId('aggregateFunctionInput')}
              label={(<FormattedMessage
                id="tsvb.table.aggregateFunctionLabel"
                defaultMessage="Aggregate function"
              />)}
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
              id="tsvb.table.colorRulesLabel"
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

TableSeriesConfigUI.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func
};

export const TableSeriesConfig = injectI18n(TableSeriesConfigUI);


