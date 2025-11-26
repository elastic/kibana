/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TopNavMenuItemBetaType } from './types';
import { TopNavPopover } from './top_nav_popover';

interface TopNavMenuShowMoreButtonProps {
  items: TopNavMenuItemBetaType[];
}

export const TopNavMenuShowMoreButton = ({ items }: TopNavMenuShowMoreButtonProps) => {
  const button = (
    <EuiButtonIcon
      iconType="boxesHorizontal" // Change to "ellipsis" when available in EUI
      size="s"
      aria-label={i18n.translate('navigation.topNavMenu.showMoreButtonLabel', {
        defaultMessage: 'Show more',
      })}
      color="text"
    />
  );

  return <TopNavPopover items={items} anchorElement={button} />;
};
