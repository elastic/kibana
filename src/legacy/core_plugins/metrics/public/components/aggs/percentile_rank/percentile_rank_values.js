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

import {
  EuiFlexGroup,
} from '@elastic/eui';
import { MultiValueRow } from './multi_value_row';

export const PercentileRankValues = props => {
  const model = props.model || [];
  const { onChange, disableAdd, disableDelete } = props;

  const onChangeValue = ({ value, id }) => {
    model[id] = value;

    onChange(model);
  };

  const onDeleteValue = ({ id }) => onChange(
    model.filter((item, currentIndex) => id !== currentIndex)
  );
  const onAddValue = () => onChange([...model, '']);

  return (
    <EuiFlexGroup direction="column" responsive={false} gutterSize="xs">
      {model.map((value, id, array) => {
        const rowModel = {
          id,
          value,
        };

        return (<MultiValueRow
          key={`percentileRankValue__item${id}`}
          onAdd={onAddValue}
          onChange={onChangeValue}
          onDelete={onDeleteValue}
          disableDelete={disableDelete || array.length < 2}
          disableAdd={disableAdd}
          model={rowModel}
        />);
      })}
    </EuiFlexGroup>
  );
};

PercentileRankValues.propTypes = {
  model: PropTypes.array,
  onChange: PropTypes.func,
  disableDelete: PropTypes.bool,
  disableAdd: PropTypes.bool,
};
