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
import React, { ChangeEvent } from 'react';
import { get } from 'lodash';

import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';

import { AddDeleteButtons } from '../../add_delete_buttons';

interface MultiValueRowProps {
  model: {
    id: number;
    value: string;
  };
  disableAdd: boolean;
  disableDelete: boolean;
  onChange: ({ value, id }: { id: number; value: string }) => void;
  onDelete: (model: { id: number; value: string }) => void;
  onAdd: () => void;
}

export const MultiValueRow = ({
  model,
  onChange,
  onDelete,
  onAdd,
  disableAdd,
  disableDelete,
}: MultiValueRowProps) => {
  const onFieldNumberChange = (event: ChangeEvent<HTMLInputElement>) =>
    onChange({
      ...model,
      value: get(event, 'target.value'),
    });

  return (
    <EuiPanel paddingSize="s" className="tvbAggRow__multiValueRow">
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem>
          <EuiFieldNumber
            value={model.value === '' ? '' : Number(model.value)}
            placeholder="0"
            onChange={onFieldNumberChange}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AddDeleteButtons
            onAdd={onAdd}
            onDelete={() => onDelete(model)}
            disableDelete={disableDelete}
            disableAdd={disableAdd}
            responsive={false}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

MultiValueRow.defaultProps = {
  model: {
    id: null,
    value: '',
  },
};
