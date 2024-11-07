/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { last } from 'lodash';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { TSVB_DEFAULT_COLOR } from '../../../../../common/constants';
import { MultiValueRow } from './multi_value_row';

interface PercentileRankValuesProps {
  values: string[];
  colors: string[];
  disableDelete: boolean;
  disableAdd: boolean;
  showOnlyLastRow: boolean;
  enableColorPicker: boolean;
  onChange: (values: string[], colors: string[]) => void;
}

export const PercentileRankValues = (props: PercentileRankValuesProps) => {
  const values = props.values || [];
  const colors = props.colors || [];
  const { onChange, disableAdd, disableDelete, showOnlyLastRow, enableColorPicker } = props;

  const onChangeValue = ({ value, id, color }: { value: string; id: number; color: string }) => {
    values[id] = value;
    colors[id] = color;

    onChange(values, colors);
  };
  const onDeleteValue = ({ id }: { id: number }) =>
    onChange(
      values.filter((item, currentIndex) => id !== currentIndex),
      colors.filter((item, currentIndex) => id !== currentIndex)
    );
  const onAddValue = () => onChange([...values, ''], [...colors, TSVB_DEFAULT_COLOR]);

  const renderRow = ({
    rowModel,
    disableDeleteRow,
    disableAddRow,
  }: {
    rowModel: { id: number; value: string; color: string };
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
        enableColorPicker={enableColorPicker}
      />
    </EuiFlexItem>
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {showOnlyLastRow &&
        renderRow({
          rowModel: {
            id: values.length - 1,
            value: last(values) || '',
            color: last(colors) || TSVB_DEFAULT_COLOR,
          },
          disableAddRow: true,
          disableDeleteRow: true,
        })}

      {!showOnlyLastRow &&
        values.map((value, id, array) =>
          renderRow({
            rowModel: {
              id,
              value: value || '',
              color: colors[id] || TSVB_DEFAULT_COLOR,
            },
            disableAddRow: disableAdd,
            disableDeleteRow: disableDelete || array.length < 2,
          })
        )}
    </EuiFlexGroup>
  );
};
