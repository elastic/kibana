/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { EuiButtonEmpty, EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Tooltip } from '../tooltip';
import { strings } from './action_strings';
import { FilterItemActionsProps } from './types';
import { actionButtonCss } from '../filter_item.styles';

export const FilterItemActions: FC<FilterItemActionsProps & { minimizePaddings?: boolean }> = ({
  disabled = false,
  disableRemove = false,
  hideOr = false,
  disableOr = false,
  hideAnd = false,
  disableAnd = false,
  minimizePaddings = false,
  onRemoveFilter,
  onOrButtonClick,
  onAddButtonClick,
}) => {
  return (
    <EuiFlexGroup justifyContent="flexEnd" alignItems="flexEnd" gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <Tooltip content={strings.getDeleteButtonDisabled()} show={disableRemove || disabled}>
          <EuiButtonIcon
            onClick={onRemoveFilter}
            iconType="trash"
            isDisabled={disableRemove || disabled}
            size="xs"
            color="danger"
            aria-label={strings.getDeleteFilterGroupButtonIconLabel()}
            {...(minimizePaddings ? { className: actionButtonCss } : {})}
          />
        </Tooltip>
      </EuiFlexItem>
      {!hideOr && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={onOrButtonClick}
            isDisabled={disableOr || disabled}
            iconType="plusInCircle"
            size="xs"
            iconSize="s"
            flush="right"
            aria-label={strings.getAddOrFilterGroupButtonIconLabel()}
            data-test-subj="add-or-filter"
            {...(minimizePaddings ? { className: actionButtonCss } : {})}
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
            size="xs"
            iconSize="s"
            flush="right"
            aria-label={strings.getAddAndFilterGroupButtonIconLabel()}
            data-test-subj="add-and-filter"
            {...(minimizePaddings ? { className: actionButtonCss } : {})}
          >
            {strings.getAddAndFilterGroupButtonLabel()}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
