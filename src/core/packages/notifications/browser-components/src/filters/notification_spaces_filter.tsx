/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSwitch, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface NotificationSpacesFilterProps {
  /** Whether the "Current only" toggle is on. */
  currentOnly: boolean;
  onChange: (next: boolean) => void;
}

/**
 * Spaces filter row for the notification center.
 *
 * Renders a subdued panel with a "Spaces" label and a "Current only" switch.
 * This component does not depend on the spaces plugin — the parent decides
 * whether to render it (i.e. only when `spaces` is available at runtime).
 */
export function NotificationSpacesFilter({ currentOnly, onChange }: NotificationSpacesFilterProps) {
  return (
    <EuiPanel color="subdued" paddingSize="s" hasShadow={false} hasBorder={false}>
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
        gutterSize="s"
      >
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>
              {i18n.translate('core.notifications.filters.spaces.title', {
                defaultMessage: 'Spaces',
              })}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            compressed
            label={i18n.translate('core.notifications.filters.spaces.currentOnly', {
              defaultMessage: 'Current only',
            })}
            checked={currentOnly}
            onChange={(e) => onChange(e.target.checked)}
            data-test-subj="notificationSpacesFilterCurrentOnly"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
