/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge } from '@elastic/eui';
import React from 'react';
import type { ChangeHistoryBadgeRenderFn } from '@kbn/change-history-ui';
import { i18n } from '@kbn/i18n';

export const renderWorkflowChangeHistoryBadge: ChangeHistoryBadgeRenderFn = ({ item }) => {
  const version = item.metadata?.version;

  if (item.isCurrent) {
    if (typeof version === 'number') {
      return (
        <EuiBadge color="hollow">
          {i18n.translate('xpack.workflowsManagement.changeHistory.currentVersionBadge', {
            defaultMessage: 'Current version • v{version}',
            values: { version },
          })}
        </EuiBadge>
      );
    }

    return (
      <EuiBadge color="hollow">
        {i18n.translate('xpack.workflowsManagement.changeHistory.currentVersionOnlyBadge', {
          defaultMessage: 'Current version',
        })}
      </EuiBadge>
    );
  }

  if (typeof version !== 'number') {
    return null;
  }

  return (
    <EuiBadge color="hollow">
      {i18n.translate('xpack.workflowsManagement.changeHistory.versionBadge', {
        defaultMessage: 'v{version}',
        values: { version },
      })}
    </EuiBadge>
  );
};
