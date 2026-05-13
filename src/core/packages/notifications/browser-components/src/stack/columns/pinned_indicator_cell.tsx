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
import type { NotificationStackItem } from '..';

export const PinnedIndicatorCell = ({
  item,
  onTogglePin,
}: {
  item: NotificationStackItem;
  onTogglePin: (item: NotificationStackItem) => void;
}) => {
  const { id, isPinned } = item;
  const pinAria = isPinned ? 'Unpin notification' : 'Pin notification';
  const pinLabel = isPinned ? 'Unpin' : 'Pin';

  return (
    <EuiButtonIcon
      iconType={isPinned ? 'pinFilled' : 'pin'}
      color={isPinned ? 'primary' : 'text'}
      aria-label={pinAria}
      title={pinLabel}
      onClick={() => onTogglePin(item)}
      data-test-subj={`${id}-notificationEventPinButton`}
    />
  );
};
