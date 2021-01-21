/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
