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
import { get } from 'lodash';

import {
  htmlIdGenerator,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import AddDeleteButtons from '../../add_delete_buttons';

export const PercentileRankValues = props => {
  const model = props.model || [];
  const { onChange, disableAdd, disableDelete } = props;
  const htmlId = htmlIdGenerator();

  const renderRows = (value, index) => {
    const onChangeValue = (event) => {
      model[index] = get(event, 'target.value');
      onChange(model);
    };

    const onDeleteValue = () => onChange(model.filter((item, currentIndex) => index !== currentIndex));
    const onAddValue = () => onChange([...model, '']);

    return (
      <div className="tvbAggRow__percentileRankValue" key={`percentileRankValue__item${index}`}>
        <EuiFlexGroup responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiFormLabel htmlFor={htmlId('value')}>
              <FormattedMessage
                id="tsvb.percentileRank.valueLabel"
                defaultMessage="Value:"
              />
            </EuiFormLabel>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFieldNumber
              value={value === '' ? '' : Number(value)}
              placeholder={0}
              onChange={onChangeValue}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <AddDeleteButtons
              onAdd={onAddValue}
              onDelete={onDeleteValue}
              disableDelete={disableDelete || model.length < 2}
              disableAdd={disableAdd}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer/>
      </div>);
  };

  return (
    <EuiFlexGroup direction="column" responsive={false} gutterSize="xs">
      {model.map(renderRows)}
    </EuiFlexGroup>
  );
};

PercentileRankValues.propTypes = {
  model: PropTypes.array,
  onChange: PropTypes.func,
  disableDelete: PropTypes.bool,
  disableAdd: PropTypes.bool,
};
