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
import { FormattedMessage } from '@kbn/i18n/react';
import {
  htmlIdGenerator,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiSpacer,
} from '@elastic/eui';

import { AddDeleteButtons } from '../../add_delete_buttons';

export const MultiValueRow = ({ model, onChange, onDelete, onAdd, disableAdd, disableDelete }) => {
  const htmlId = htmlIdGenerator();

  const onFieldNumberChange = event =>
    onChange({
      ...model,
      value: get(event, 'target.value'),
    });

  return (
    <div className="tvbAggRow__multiValueRow">
      <EuiFlexGroup responsive={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiFormLabel htmlFor={htmlId('value')}>
            <FormattedMessage id="tsvb.multivalueRow.valueLabel" defaultMessage="Value:" />
          </EuiFormLabel>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFieldNumber
            value={model.value === '' ? '' : Number(model.value)}
            placeholder={0}
            onChange={onFieldNumberChange}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AddDeleteButtons
            onAdd={onAdd}
            onDelete={() => onDelete(model)}
            disableDelete={disableDelete}
            disableAdd={disableAdd}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
    </div>
  );
};

MultiValueRow.defaultProps = {
  model: {
    id: null,
    value: '',
  },
};

MultiValueRow.propTypes = {
  model: PropTypes.object,
  onChange: PropTypes.func,
  onDelete: PropTypes.func,
  onAdd: PropTypes.func,
  defaultAddValue: PropTypes.string,
  disableDelete: PropTypes.bool,
};
