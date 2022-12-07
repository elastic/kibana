/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Tooltip } from '../tooltip';
import { strings } from './action_strings';
import { FilterItemActionsProps } from './types';

export const FilterItemActions: FC<FilterItemActionsProps> = ({
  disabled = false,
  disableRemove = false,
  hideOr = false,
  disableOr = false,
  hideAnd = false,
  disableAnd = false,
  onRemoveFilter,
  onOrButtonClick,
  onAddButtonClick,
}) => {
  return (
    <EuiFlexGroup justifyContent="flexEnd" alignItems="flexEnd" gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <Tooltip content={strings.getDeleteButtonDisabled()} show={disableRemove || disabled}>
          <EuiButtonEmpty
            onClick={onRemoveFilter}
            iconType="trash"
            isDisabled={disableRemove || disabled}
            size="s"
            color="danger"
            aria-label={strings.getDeleteFilterGroupButtonIconLabel()}
          />
        </Tooltip>
      </EuiFlexItem>
      {!hideOr && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={onOrButtonClick}
            isDisabled={disableOr || disabled}
            iconType="plusInCircle"
            size="s"
            iconSize="s"
            aria-label={strings.getAddOrFilterGroupButtonIconLabel()}
            data-test-subj="add-or-filter"
          >
            {strings.getAddOrFilterGroupButtonLabel()}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
      {!hideAnd && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={onAddButtonClick}
            isDisabled={disableAnd || disabled}
            iconType="plusInCircle"
            size="s"
            iconSize="s"
            aria-label={strings.getAddAndFilterGroupButtonIconLabel()}
            data-test-subj="add-and-filter"
          >
            {strings.getAddAndFilterGroupButtonLabel()}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
