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
import React from 'react';
import { assign } from 'lodash';
import { AggSelect } from '../agg_select';
import { FieldSelect } from '../field_select';
import { AggRow } from '../agg_row';
import { createChangeHandler } from '../../lib/create_change_handler';
import { createSelectHandler } from '../../lib/create_select_handler';
import { PercentileRankValues } from './percentile_rank_values';

import {
  htmlIdGenerator,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { KBN_FIELD_TYPES } from '../../../../../../../plugins/data/public';

const RESTRICT_FIELDS = [KBN_FIELD_TYPES.NUMBER];

export const PercentileRankAgg = props => {
  const { series, panel, fields } = props;
  const defaults = { values: [''] };
  const model = { ...defaults, ...props.model };

  const indexPattern =
    (series.override_index_pattern && series.series_index_pattern) || panel.index_pattern;
  const htmlId = htmlIdGenerator();
  const isTablePanel = panel.type === 'table';
  const handleChange = createChangeHandler(props.onChange, model);
  const handleSelectChange = createSelectHandler(handleChange);

  const handlePercentileRankValuesChange = values => {
    handleChange(
      assign({}, model, {
        values,
      })
    );
  };

  return (
    <AggRow
      disableDelete={props.disableDelete}
      model={props.model}
      onAdd={props.onAdd}
      onDelete={props.onDelete}
      siblings={props.siblings}
      dragHandleProps={props.dragHandleProps}
    >
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiFormLabel htmlFor={htmlId('aggregation')}>
            <FormattedMessage
              id="visTypeTimeseries.percentileRank.aggregationLabel"
              defaultMessage="Aggregation"
            />
          </EuiFormLabel>
          <EuiSpacer size="xs" />
          <AggSelect
            id={htmlId('aggregation')}
            panelType={props.panel.type}
            siblings={props.siblings}
            value={model.type}
            onChange={handleSelectChange('type')}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('field')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.percentileRank.fieldLabel"
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
      <EuiSpacer />
      <PercentileRankValues
        disableAdd={isTablePanel}
        disableDelete={isTablePanel}
        showOnlyLastRow={isTablePanel}
        model={model.values}
        onChange={handlePercentileRankValuesChange}
      />
    </AggRow>
  );
};

PercentileRankAgg.propTypes = {
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
