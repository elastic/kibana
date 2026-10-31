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
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AccessCopy } from './copy';
import type { AccessStateResponse } from './types';

const DEFAULT_OPERATION_LABELS: Record<string, string> = {
  view: i18n.translate('accessControlUi.summary.view', { defaultMessage: 'View' }),
  use: i18n.translate('accessControlUi.summary.use', { defaultMessage: 'Use' }),
  edit: i18n.translate('accessControlUi.summary.edit', { defaultMessage: 'Edit' }),
  delete: i18n.translate('accessControlUi.summary.delete', { defaultMessage: 'Delete' }),
  manage_access: i18n.translate('accessControlUi.summary.manageAccess', {
    defaultMessage: 'Manage access',
  }),
};

export interface AccessSummaryProps {
  state: AccessStateResponse;
  /** Operations to list, in order. */
  operations: string[];
  copy: AccessCopy;
}

/**
 * Shows what the current user can do with an object. People who cannot manage access see only
 * this: the owner and the named entries are not sent to them.
 */
export const AccessSummary = ({ state, operations, copy }: AccessSummaryProps) => (
  <EuiPanel hasBorder paddingSize="m" data-test-subj="accessPanelReadOnly">
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h3>
            {i18n.translate('accessControlUi.summary.title', { defaultMessage: 'Your access' })}
          </h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {state.restricted ? (
          <EuiBadge color="hollow" iconType="lock">
            {i18n.translate('accessControlUi.summary.restricted', {
              defaultMessage: 'Restricted',
            })}
          </EuiBadge>
        ) : (
          <EuiBadge color="hollow" iconType="globe">
            {i18n.translate('accessControlUi.summary.public', {
              defaultMessage: 'Everyone in this space',
            })}
          </EuiBadge>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="s" />
    <EuiText size="s" color="subdued">
      {i18n.translate('accessControlUi.summary.description', {
        defaultMessage: 'The owner of this {objectNoun} decides who else can access it.',
        values: { objectNoun: copy.objectNoun },
      })}
    </EuiText>
    <EuiSpacer size="m" />
    <EuiFlexGroup direction="column" gutterSize="xs">
      {[...operations, 'manage_access'].map((operation) => {
        const isAllowed = state.permissions.includes(operation);
        return (
          <EuiFlexItem key={operation} data-test-subj={`accessPanelPermission-${operation}`}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon
                  type={isAllowed ? 'check' : 'cross'}
                  color={isAllowed ? 'success' : 'subdued'}
                  aria-label={
                    isAllowed
                      ? i18n.translate('accessControlUi.summary.allowed', {
                          defaultMessage: 'Allowed',
                        })
                      : i18n.translate('accessControlUi.summary.notAllowed', {
                          defaultMessage: 'Not allowed',
                        })
                  }
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s" color={isAllowed ? 'default' : 'subdued'}>
                  {copy.operations?.[operation] ?? DEFAULT_OPERATION_LABELS[operation] ?? operation}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  </EuiPanel>
);
