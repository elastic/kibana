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
import uuid from 'uuid';
import { AggRow } from './agg_row';
import { AggSelect } from './agg_select';

import { createChangeHandler } from '../lib/create_change_handler';
import { createSelectHandler } from '../lib/create_select_handler';
import { createTextHandler } from '../lib/create_text_handler';
import { CalculationVars } from './vars';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  htmlIdGenerator,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiTextArea,
  EuiFormRow,
  EuiCode,
  EuiSpacer,
} from '@elastic/eui';

export class CalculationAgg extends Component {
  UNSAFE_componentWillMount() {
    if (!this.props.model.variables) {
      this.props.onChange(
        _.assign({}, this.props.model, {
          variables: [{ id: uuid.v1() }],
        })
      );
    }
  }

  render() {
    const { siblings } = this.props;

    const defaults = { script: '' };
    const model = { ...defaults, ...this.props.model };

    const handleChange = createChangeHandler(this.props.onChange, model);
    const handleSelectChange = createSelectHandler(handleChange);
    const handleTextChange = createTextHandler(handleChange);

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
        <EuiFlexGroup direction="column" gutterSize="l">
          <EuiFlexItem>
            <EuiFormLabel htmlFor={htmlId('aggregation')}>
              <FormattedMessage
                id="visTypeTimeseries.calculation.aggregationLabel"
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
            <EuiFormLabel htmlFor={htmlId('variables')}>
              <FormattedMessage
                id="visTypeTimeseries.calculation.variablesLabel"
                defaultMessage="Variables"
              />
            </EuiFormLabel>
            <EuiSpacer size="xs" />
            <CalculationVars
              id={htmlId('variables')}
              metrics={siblings}
              onChange={handleChange}
              name="variables"
              model={model}
            />
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiFormRow
              id={htmlId('painless')}
              label={
                <FormattedMessage
                  id="visTypeTimeseries.calculation.painlessScriptLabel"
                  defaultMessage="Painless Script"
                />
              }
              fullWidth
              helpText={
                <div>
                  <FormattedMessage
                    id="visTypeTimeseries.calculation.painlessScriptDescription"
                    defaultMessage="Variables are keys on the {params} object, i.e. {paramsName}. To access the bucket
                    interval (in milliseconds) use {paramsInterval}."
                    values={{
                      params: <EuiCode>params</EuiCode>,
                      paramsName: <EuiCode>params.&lt;name&gt;</EuiCode>,
                      paramsInterval: <EuiCode>params._interval</EuiCode>,
                    }}
                  />
                </div>
              }
            >
              <EuiTextArea onChange={handleTextChange('script')} value={model.script} fullWidth />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </AggRow>
    );
  }
}

CalculationAgg.propTypes = {
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
