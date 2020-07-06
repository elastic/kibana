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
import React from 'react';
import { last } from 'lodash';

import { EuiFlexGroup } from '@elastic/eui';
import { MultiValueRow } from './multi_value_row';

interface PercentileRankValuesProps {
  model: Array<string | null>;
  disableDelete: boolean;
  disableAdd: boolean;
  showOnlyLastRow: boolean;
  onChange: (values: any[]) => void;
}

export const PercentileRankValues = (props: PercentileRankValuesProps) => {
  const model = props.model || [];
  const { onChange, disableAdd, disableDelete, showOnlyLastRow } = props;

  const onChangeValue = ({ value, id }: { value: string; id: number }) => {
    model[id] = value;

    onChange(model);
  };
  const onDeleteValue = ({ id }: { id: number }) =>
    onChange(model.filter((item, currentIndex) => id !== currentIndex));
  const onAddValue = () => onChange([...model, '']);

  const renderRow = ({
    rowModel,
    disableDeleteRow,
    disableAddRow,
  }: {
    rowModel: { id: number; value: string };
    disableDeleteRow: boolean;
    disableAddRow: boolean;
  }) => (
    <MultiValueRow
      key={`percentileRankValue__item${rowModel.id}`}
      onAdd={onAddValue}
      onChange={onChangeValue}
      onDelete={onDeleteValue}
      disableDelete={disableDeleteRow}
      disableAdd={disableAddRow}
      model={rowModel}
    />
  );

  return (
    <EuiFlexGroup direction="column" responsive={false} gutterSize="xs">
      {showOnlyLastRow &&
        renderRow({
          rowModel: {
            id: model.length - 1,
            value: last(model) || '',
          },
          disableAddRow: true,
          disableDeleteRow: true,
        })}

      {!showOnlyLastRow &&
        model.map((value, id, array) =>
          renderRow({
            rowModel: {
              id,
              value: value || '',
            },
            disableAddRow: disableAdd,
            disableDeleteRow: disableDelete || array.length < 2,
          })
        )}
    </EuiFlexGroup>
  );
};
