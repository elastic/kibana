/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiAvatar,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useWorkflowHistory } from '../../../entities/workflows/model/use_workflow_history';
import type { WorkflowHistoryItem } from '../../../entities/workflows/model/use_workflow_history';
import { FormattedRelativeEnhanced } from '../../../shared/ui/formatted_relative_enhanced/formatted_relative_enhanced';

export interface WorkflowVersionHistoryFlyoutProps {
  workflowId: string;
  onClose: () => void;
}

function getInitial(name: string | undefined, userId: string | undefined): string {
  if (name && name.length > 0) {
    return name.charAt(0).toUpperCase();
  }
  if (userId && userId.length > 0) {
    return userId.charAt(0).toUpperCase();
  }
  return '?';
}

function VersionHistoryListItem({ item }: { item: WorkflowHistoryItem }) {
  const timestamp = item['@timestamp'] ? new Date(item['@timestamp']) : null;
  const userName = item.user?.name ?? item.user?.id ?? 'Unknown';
  const changeCount = item.object?.fields?.changed?.length ?? 0;
  const action = item.event?.action ?? 'workflow-update';

  const changesLabel =
    action === 'workflow-create'
      ? i18n.translate('workflows.versionHistory.created', { defaultMessage: 'Created workflow' })
      : i18n.translate('workflows.versionHistory.madeChanges', {
          defaultMessage: 'made {count, plural, one {# change} other {# changes}}',
          values: { count: changeCount },
        });

  return (
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiAvatar name={userName} size="s" initials={getInitial(item.user?.name, item.user?.id)} />
      </EuiFlexItem>
      <EuiFlexItem grow={1} style={{ minWidth: 0 }}>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <EuiText size="s">
              {timestamp ? (
                <FormattedRelativeEnhanced value={timestamp} />
              ) : (
                <FormattedMessage
                  id="workflows.versionHistory.unknownDate"
                  defaultMessage="Unknown date"
                />
              )}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              {userName}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              {changesLabel}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export const WorkflowVersionHistoryFlyout = React.memo<WorkflowVersionHistoryFlyoutProps>(
  ({ workflowId, onClose }) => {
    const { data, isLoading, error } = useWorkflowHistory(workflowId);

    const title = i18n.translate('workflows.versionHistory.flyoutTitle', {
      defaultMessage: 'Version history',
    });

    return (
      <EuiFlyout
      type="push"
      onClose={onClose}
      size="s"
      aria-labelledby="workflow-version-history-title"
    >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id="workflow-version-history-title">{title}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {isLoading && (
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner />
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
          {error && (
            <EuiEmptyPrompt
              iconType="alert"
              color="danger"
              title={
                <FormattedMessage
                  id="workflows.versionHistory.errorTitle"
                  defaultMessage="Unable to load version history"
                />
              }
              body={String(error)}
            />
          )}
          {!isLoading && !error && data && (
            <>
              <EuiText size="s" color="subdued">
                <FormattedMessage
                  id="workflows.versionHistory.currentVersion"
                  defaultMessage="Current version"
                />
              </EuiText>
              <EuiSpacer size="m" />
              {data.items.length === 0 ? (
                <EuiEmptyPrompt
                  iconType="clock"
                  title={
                    <FormattedMessage
                      id="workflows.versionHistory.emptyTitle"
                      defaultMessage="No version history yet"
                    />
                  }
                  body={
                    <FormattedMessage
                      id="workflows.versionHistory.emptyBody"
                      defaultMessage="Previous versions will appear here after you save changes."
                    />
                  }
                />
              ) : (
                data.items.map((item) => (
                  <React.Fragment key={item.event?.id ?? item['@timestamp'] ?? Math.random()}>
                    <VersionHistoryListItem item={item} />
                    <EuiSpacer size="m" />
                  </React.Fragment>
                ))
              )}
            </>
          )}
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }
);
WorkflowVersionHistoryFlyout.displayName = 'WorkflowVersionHistoryFlyout';
