/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFilterButton, EuiFilterGroup, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type NotificationReadState = 'all' | 'unread' | 'read';

export interface NotificationReadStateFilterProps {
  value: NotificationReadState;
  onChange: (next: NotificationReadState) => void;
}

const OPTIONS: NotificationReadState[] = ['all', 'unread', 'read'];

const LABEL_KEYS: Record<NotificationReadState, { id: string; defaultMessage: string }> = {
  all: { id: 'core.notifications.filters.readState.all', defaultMessage: 'All' },
  unread: { id: 'core.notifications.filters.readState.unread', defaultMessage: 'Unread' },
  read: { id: 'core.notifications.filters.readState.read', defaultMessage: 'Read' },
};

/**
 * Single-select read-state filter row for the notification center.
 *
 * Replaces the old All/Unread/Read tabs above the events list. State is owned
 * by the caller; this component is purely presentational.
 */
export function NotificationReadStateFilter({ value, onChange }: NotificationReadStateFilterProps) {
  return (
    <div>
      <EuiTitle size="xxs">
        <h4>
          {i18n.translate('core.notifications.filters.readState.title', {
            defaultMessage: 'Read state',
          })}
        </h4>
      </EuiTitle>

      <EuiSpacer size="s" />

      <EuiFilterGroup compressed>
        {OPTIONS.map((option) => (
          <EuiFilterButton
            key={option}
            isSelected={value === option}
            hasActiveFilters={value === option}
            onClick={() => onChange(option)}
            data-test-subj={`notificationReadStateFilter-${option}`}
          >
            {i18n.translate(LABEL_KEYS[option].id, {
              defaultMessage: LABEL_KEYS[option].defaultMessage,
            })}
          </EuiFilterButton>
        ))}
      </EuiFilterGroup>
    </div>
  );
}
