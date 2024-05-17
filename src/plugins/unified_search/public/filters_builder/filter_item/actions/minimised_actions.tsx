/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButtonIcon, EuiPopover } from '@elastic/eui';
import React, { FC, useState } from 'react';
import { strings } from './action_strings';
import { FilterItemActions } from './actions';
import { FilterItemActionsProps } from './types';

export const MinimisedFilterItemActions: FC<FilterItemActionsProps> = (props) => {
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
      <FilterItemActions {...props} minimizePaddings={true} />
    </EuiPopover>
  );
};
