/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { last } from 'lodash';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
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
    <EuiFlexItem key={`percentileRankValue__item${rowModel.id}`}>
      <MultiValueRow
        onAdd={onAddValue}
        onChange={onChangeValue}
        onDelete={onDeleteValue}
        disableDelete={disableDeleteRow}
        disableAdd={disableAddRow}
        model={rowModel}
      />
    </EuiFlexItem>
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
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
