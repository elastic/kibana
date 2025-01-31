/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ChangeEvent } from 'react';
import { get } from 'lodash';

import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { TSVB_DEFAULT_COLOR } from '../../../../../common/constants';

import { AddDeleteButtons } from '../../add_delete_buttons';
import { ColorPicker, ColorProps } from '../../color_picker';

interface MultiValueRowProps {
  model: {
    id: number;
    value: string;
    color: string;
  };
  disableAdd: boolean;
  disableDelete: boolean;
  enableColorPicker: boolean;
  onChange: ({ value, id, color }: { id: number; value: string; color: string }) => void;
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
  enableColorPicker,
}: MultiValueRowProps) => {
  const onFieldNumberChange = (event: ChangeEvent<HTMLInputElement>) =>
    onChange({
      ...model,
      value: get(event, 'target.value'),
    });

  const onColorPickerChange = (props: ColorProps) =>
    onChange({
      ...model,
      color: props?.color || TSVB_DEFAULT_COLOR,
    });

  return (
    <EuiPanel paddingSize="s" className="tvbAggRow__multiValueRow">
      <EuiFlexGroup alignItems="center" gutterSize="s">
        {enableColorPicker && (
          <EuiFlexItem grow={false}>
            <ColorPicker
              disableTrash={true}
              onChange={onColorPickerChange}
              value={model.color}
              name="color"
            />
          </EuiFlexItem>
        )}
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
