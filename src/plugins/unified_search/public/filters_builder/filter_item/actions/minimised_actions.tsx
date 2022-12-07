/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useState } from 'react';
import { EuiButtonEmpty, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPopover } from '@elastic/eui';
import { Tooltip } from '../tooltip';
import { strings } from './action_strings';
import { FilterItemActionsProps } from './types';

export const MinimisedFilterItemActions: FC<FilterItemActionsProps> = ({
  disabled = false,
  disableRemove = false,
  hideOr = false,
  disableOr = false,
  disableAnd = false,
  onRemoveFilter,
  onOrButtonClick,
  onAddButtonClick,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onMoreActionsButtonClick = () => {
    setIsPopoverOpen((isOpen) => !isOpen);
  };

  const closePopover = () => setIsPopoverOpen(false);

  const button = (
    <EuiButtonIcon
      iconType="boxesHorizontal"
      color="text"
      aria-label={strings.getMoreActionsLabel()}
      onClick={onMoreActionsButtonClick}
    />
  );

  return (
    <EuiPopover ownFocus={false} button={button} isOpen={isPopoverOpen} closePopover={closePopover}>
      <EuiFlexGroup
        justifyContent="flexEnd"
        alignItems="flexEnd"
        gutterSize="xs"
        responsive={false}
      >
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
        {!hideOr ? (
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
        ) : null}
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
      </EuiFlexGroup>
    </EuiPopover>
  );
};
