/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiFilterButton, EuiFilterGroup, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

/** The set of "state"-style filters a notification center can apply. */
export type NotificationStateFilterValue = 'all' | 'unread' | 'pinned';

export interface NotificationStateFilterProps {
  value: NotificationStateFilterValue;
  onChange: (next: NotificationStateFilterValue) => void;
}

/**
 * Single-select state filter row for the notification center.
 *
 * Replaces the older All/Unread/Read tabs above the events list. Options:
 *  - **All** — no constraint
 *  - **Unread** — events where `isRead` is false
 *  - **Pinned** — events where `isPinned` is true
 *
 * Each option is rendered as an `EuiFilterButton` with `isToggle={true}` so
 * the selected one renders in inverse color mode (filled background).
 */
export function NotificationStateFilter({ value, onChange }: NotificationStateFilterProps) {
  const options = useMemo<Array<{ id: NotificationStateFilterValue; label: string }>>(
    () => [
      {
        id: 'all',
        label: i18n.translate('core.notifications.filters.state.all', {
          defaultMessage: 'All',
        }),
      },
      {
        id: 'unread',
        label: i18n.translate('core.notifications.filters.state.unread', {
          defaultMessage: 'Unread',
        }),
      },
      {
        id: 'pinned',
        label: i18n.translate('core.notifications.filters.state.pinned', {
          defaultMessage: 'Pinned',
        }),
      },
    ],
    []
  );

  return (
    <div>
      <EuiTitle size="xxs">
        <h4>
          {i18n.translate('core.notifications.filters.state.title', {
            defaultMessage: 'State',
          })}
        </h4>
      </EuiTitle>

      <EuiSpacer size="s" />

      <EuiFilterGroup compressed>
        {options.map((option, idx) => (
          <EuiFilterButton
            key={option.id}
            isToggle
            isSelected={value === option.id}
            withNext={idx < options.length - 1}
            onClick={() => onChange(option.id)}
            data-test-subj={`notificationStateFilter-${option.id}`}
          >
            {option.label}
          </EuiFilterButton>
        ))}
      </EuiFilterGroup>
    </div>
  );
}
