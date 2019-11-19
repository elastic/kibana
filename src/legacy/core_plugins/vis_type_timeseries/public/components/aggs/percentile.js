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
import _ from 'lodash';
import { AggSelect } from './agg_select';
import { FieldSelect } from './field_select';
import { AggRow } from './agg_row';
import { createChangeHandler } from '../lib/create_change_handler';
import { createSelectHandler } from '../lib/create_select_handler';
import {
  htmlIdGenerator,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiFormRow,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { KBN_FIELD_TYPES } from '../../../../../../plugins/data/public';
import { Percentiles, newPercentile } from './percentile_ui';

const RESTRICT_FIELDS = [KBN_FIELD_TYPES.NUMBER];

export class PercentileAgg extends Component {
  // eslint-disable-line react/no-multi-comp

  UNSAFE_componentWillMount() {
    if (!this.props.model.percentiles) {
      this.props.onChange(
        _.assign({}, this.props.model, {
          percentiles: [newPercentile({ value: 50 })],
        })
      );
    }
  }

  render() {
    const { series, model, panel, fields } = this.props;

    const handleChange = createChangeHandler(this.props.onChange, model);
    const handleSelectChange = createSelectHandler(handleChange);
    const indexPattern =
      (series.override_index_pattern && series.series_index_pattern) || panel.index_pattern;
    const htmlId = htmlIdGenerator();

    return (
      <AggRow
        disableDelete={this.props.disableDelete}
        model={this.props.model}
        onAdd={this.props.onAdd}
        onDelete={this.props.onDelete}
        siblings={this.props.siblings}
        dragHandleProps={this.props.dragHandleProps}
      >
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <EuiFormLabel htmlFor={htmlId('aggregation')}>
              <FormattedMessage
                id="visTypeTimeseries.percentile.aggregationLabel"
                defaultMessage="Aggregation"
              />
            </EuiFormLabel>
            <EuiSpacer size="xs" />
            <AggSelect
              id={htmlId('aggregation')}
              panelType={this.props.panel.type}
              siblings={this.props.siblings}
              value={model.type}
              onChange={handleSelectChange('type')}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              id={htmlId('field')}
              label={
                <FormattedMessage
                  id="visTypeTimeseries.percentile.fieldLabel"
                  defaultMessage="Field"
                />
              }
            >
              <FieldSelect
                fields={fields}
                type={model.type}
                restrict={RESTRICT_FIELDS}
                indexPattern={indexPattern}
                value={model.field}
                onChange={handleSelectChange('field')}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <Percentiles onChange={handleChange} name="percentiles" model={model} panel={panel} />
      </AggRow>
    );
  }
}

PercentileAgg.propTypes = {
  disableDelete: PropTypes.bool,
  fields: PropTypes.object,
  model: PropTypes.object,
  onAdd: PropTypes.func,
  onChange: PropTypes.func,
  onDelete: PropTypes.func,
  panel: PropTypes.object,
  series: PropTypes.object,
  siblings: PropTypes.array,
};
