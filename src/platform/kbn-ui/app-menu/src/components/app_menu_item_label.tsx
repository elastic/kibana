/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  EuiTextTruncate,
  type IconType,
} from '@elastic/eui';
import { AppMenuBadge } from './app_menu_badge';
import { asOptionalPlainText, asPlainText } from '../as_plain_text';

interface AppMenuItemLabelProps {
  label: string;
  description: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  testId?: string;
  labelBadgeText?: string;
  iconType?: IconType;
}

export const AppMenuItemLabel = ({
  label,
  description,
  isDisabled,
  isLoading,
  testId,
  labelBadgeText,
  iconType,
}: AppMenuItemLabelProps) => {
  const badgeText = asOptionalPlainText(labelBadgeText);

  const icon = isLoading ? (
    <EuiLoadingSpinner size="m" data-test-subj={testId ? `${testId}-loading` : undefined} />
  ) : iconType ? (
    <EuiIcon type={iconType} size="m" color="inherit" aria-hidden={true} />
  ) : undefined;

  return (
    <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          {icon && <EuiFlexItem grow={false}>{icon}</EuiFlexItem>}
          <EuiFlexItem grow={false}>{asPlainText(label)}</EuiFlexItem>
          {badgeText && (
            <EuiFlexItem grow={false}>
              <AppMenuBadge
                text={badgeText}
                data-test-subj={testId ? `${testId}-badge` : undefined}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText
          size="xs"
          color={isDisabled ? undefined : 'subdued'}
          component="span"
          data-test-subj={testId ? `${testId}-description` : undefined}
        >
          <EuiTextTruncate text={asOptionalPlainText(description) ?? ''} />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
