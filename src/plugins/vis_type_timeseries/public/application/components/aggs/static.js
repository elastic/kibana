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
import { AggSelect } from './agg_select';
import { AggRow } from './agg_row';
import { createChangeHandler } from '../lib/create_change_handler';
import { createSelectHandler } from '../lib/create_select_handler';
import { createTextHandler } from '../lib/create_text_handler';
import {
  htmlIdGenerator,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiFieldNumber,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export const Static = props => {
  const handleChange = createChangeHandler(props.onChange, props.model);
  const handleSelectChange = createSelectHandler(handleChange);
  const handleTextChange = createTextHandler(handleChange);

  const defaults = {
    numerator: '*',
    denominator: '*',
    metric_agg: 'count',
    value: '',
  };

  const model = { ...defaults, ...props.model };
  const htmlId = htmlIdGenerator();

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
              id="visTypeTimeseries.static.aggregationLabel"
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
            id={htmlId('staticValue')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.static.staticValuesLabel"
                defaultMessage="Static Value"
              />
            }
          >
            <EuiFieldNumber
              onChange={handleTextChange('value')}
              value={model.value === '' ? '' : Number(model.value)}
              step={0.1}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </AggRow>
  );
};

Static.propTypes = {
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
