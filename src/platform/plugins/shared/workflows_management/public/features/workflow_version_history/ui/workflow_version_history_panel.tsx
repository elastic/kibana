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
  EuiBadge,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useWorkflowHistory } from '../../../entities/workflows/model/use_workflow_history';
import type { WorkflowHistoryItem } from '../../../entities/workflows/model/use_workflow_history';
import { useGetFormattedDateTime } from '../../../shared/ui/use_formatted_date';
import { WorkflowUnsavedChangesBadge } from '../../../widgets/workflow_yaml_editor/ui/workflow_unsaved_changes_badge';

export interface WorkflowVersionHistoryPanelProps {
  workflowId: string;
  onClose: () => void;
  /** When true, show a "Current version" card at the top (editing state) above the saved versions list. */
  hasUnsavedChanges?: boolean;
  /** Passed to WorkflowUnsavedChangesBadge in the current version card. */
  highlightDiff?: boolean;
  setHighlightDiff?: React.Dispatch<React.SetStateAction<boolean>>;
  lastUpdatedAt?: Date | null;
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

function formatVersionTimestamp(date: Date): string {
  const datePart = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timePart = date
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
    .replace(':', '.');
  return i18n.translate('workflows.versionHistory.timestampFormat', {
    defaultMessage: 'On {date} @{time}',
    values: { date: datePart, time: timePart },
  });
}

function VersionHistoryListItem({ item }: { item: WorkflowHistoryItem }) {
  const timestamp = item['@timestamp'] ? new Date(item['@timestamp']) : null;
  const userName = item.user?.name ?? item.user?.id ?? 'Unknown';
  const changedFields = item.object?.fields?.changed ?? [];
  const changeCount = changedFields.length;
  const action = item.event?.action ?? 'workflow-update';
  const isCreate = action === 'workflow-create';

  const changesWord = i18n.translate('workflows.versionHistory.changes', {
    defaultMessage: 'Changes',
  });
  const createdLabel = i18n.translate('workflows.versionHistory.created', {
    defaultMessage: 'Created workflow',
  });
  const madeLabel = i18n.translate('workflows.versionHistory.made', {
    defaultMessage: 'made ',
  });

  const changesTooltipContent =
    changedFields.length > 0 ? (
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {changedFields.map((field) => (
          <li key={field}>{field.replace('definition.', '')}</li>
        ))}
      </ul>
    ) : null;

  const changeCountBadge = (
    <EuiBadge color="hollow" data-test-subj="workflowVersionHistoryChangeCount">
      {changeCount}
    </EuiBadge>
  );

  return (
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap={false}>
      <EuiFlexItem grow={false}>
        <EuiAvatar name={userName} size="s" initials={getInitial(item.user?.name, item.user?.id)} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          {timestamp ? (
            formatVersionTimestamp(timestamp)
          ) : (
            <FormattedMessage
              id="workflows.versionHistory.unknownDate"
              defaultMessage="Unknown date"
            />
          )}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">{userName}</EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {isCreate ? (
          <EuiText size="s" color="subdued">
            <strong>{createdLabel}</strong>
          </EuiText>
        ) : (
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {madeLabel}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{changesWord}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {changesTooltipContent ? (
                <EuiToolTip
                  content={changesTooltipContent}
                  title={i18n.translate('workflows.versionHistory.changedFieldsTitle', {
                    defaultMessage: 'Changed fields',
                  })}
                >
                  {changeCountBadge}
                </EuiToolTip>
              ) : (
                changeCountBadge
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={true} />
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="boxesVertical"
          size="s"
          color="text"
          aria-label={i18n.translate('workflows.versionHistory.actions', {
            defaultMessage: 'Actions',
          })}
          data-test-subj="workflowVersionHistoryRowActions"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

const getPanelStyles = (euiTheme: {
  colors: { backgroundBasePlain: string; borderBasePlain: string; emptyShade: string };
  border: { radius: { medium: string } };
  shadow?: { s?: string };
}) => ({
  panel: css({
    height: '100%',
    minHeight: '100%',
    alignSelf: 'stretch',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: euiTheme.colors.backgroundBasePlain,
    boxShadow: euiTheme.shadow?.s ?? 'none',
    borderLeft: `1px solid ${euiTheme.colors.borderBasePlain}`,
  }),
  header: css({
    flexShrink: 0,
    flexGrow: 0,
    padding: '16px 16px 12px',
    borderBottom: `1px solid ${euiTheme.colors.borderBasePlain}`,
  }),
  body: css({
    flex: '1 1 0',
    overflow: 'auto',
    minHeight: 0,
    padding: '16px',
    display: 'block',
  }),
  currentVersionCard: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    marginBottom: '8px',
    backgroundColor: euiTheme.colors.emptyShade,
    border: `1px solid ${euiTheme.colors.borderBasePlain}`,
    borderRadius: euiTheme.border.radius.medium,
    boxShadow: euiTheme.shadow?.s ?? 'none',
  }),
  versionEntryCard: css({
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    marginBottom: '8px',
    backgroundColor: euiTheme.colors.emptyShade,
    border: `1px solid ${euiTheme.colors.borderBasePlain}`,
    borderRadius: euiTheme.border.radius.medium,
    boxShadow: euiTheme.shadow?.s ?? 'none',
    '&:last-of-type': {
      marginBottom: 0,
    },
    '& > *': {
      flex: '1 1 0',
      minWidth: 0,
    },
  }),
});

export const WorkflowVersionHistoryPanel = React.memo<WorkflowVersionHistoryPanelProps>(
  ({
    workflowId,
    onClose,
    hasUnsavedChanges = false,
    highlightDiff = false,
    setHighlightDiff = () => {},
    lastUpdatedAt = null,
  }) => {
    const { euiTheme } = useEuiTheme();
    const styles = getPanelStyles(euiTheme);
    const getFormattedDateTime = useGetFormattedDateTime();
    const { data, isLoading, error } = useWorkflowHistory(workflowId);

    const historyStartedLabel = data?.startDate
      ? getFormattedDateTime(new Date(data.startDate))
      : null;

    const title = i18n.translate('workflows.versionHistory.panelTitle', {
      defaultMessage: 'Version history',
    });
    const closeLabel = i18n.translate('workflows.versionHistory.close', {
      defaultMessage: 'Close',
    });

    return (
      <EuiPanel
        paddingSize="none"
        hasShadow={false}
        hasBorder={false}
        css={styles.panel}
        data-test-subj="workflowVersionHistoryPanel"
      >
        <EuiFlexGroup
          alignItems="center"
          justifyContent="spaceBetween"
          gutterSize="s"
          css={styles.header}
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id="workflow-version-history-title">{title}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              aria-label={closeLabel}
              onClick={onClose}
              data-test-subj="workflowVersionHistoryPanelClose"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <div css={styles.body}>
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
              {hasUnsavedChanges && (
                <div
                  css={styles.currentVersionCard}
                  data-test-subj="workflowVersionHistoryCurrentVersion"
                >
                  <EuiFlexGroup
                    alignItems="center"
                    gutterSize="m"
                    responsive={false}
                    wrap={false}
                    css={{ flex: '0 0 auto' }}
                  >
                    <EuiFlexItem grow={false}>
                      <EuiText size="s">
                        <FormattedMessage
                          id="workflows.versionHistory.currentVersion"
                          defaultMessage="Current version"
                        />
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <WorkflowUnsavedChangesBadge
                        hasChanges={hasUnsavedChanges}
                        highlightDiff={highlightDiff}
                        setHighlightDiff={setHighlightDiff}
                        lastUpdatedAt={lastUpdatedAt}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiButtonIcon
                    iconType="boxesVertical"
                    size="s"
                    color="text"
                    aria-label={i18n.translate('workflows.versionHistory.currentVersionActions', {
                      defaultMessage: 'Current version actions',
                    })}
                    data-test-subj="workflowVersionHistoryCurrentVersionActions"
                  />
                </div>
              )}
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
                <>
                  {data.items.map((item) => (
                    <div
                      key={item.event?.id ?? item['@timestamp'] ?? Math.random()}
                      css={styles.versionEntryCard}
                      data-test-subj="workflowVersionHistoryEntry"
                    >
                      <VersionHistoryListItem item={item} />
                    </div>
                  ))}
                  {historyStartedLabel && (
                    <div
                      css={styles.versionEntryCard}
                      data-test-subj="workflowVersionHistoryStartDateEntry"
                    >
                      <EuiFlexGroup
                        alignItems="center"
                        gutterSize="m"
                        responsive={false}
                        wrap={false}
                      >
                        <EuiFlexItem grow={false}>
                          <EuiIcon
                            type="clock"
                            size="s"
                            color="subdued"
                            aria-label={i18n.translate('workflows.versionHistory.historyStartedIcon', {
                              defaultMessage: 'History started',
                            })}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiText size="s" color="subdued">
                            {historyStartedLabel}
                          </EuiText>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiText size="s" color="subdued">
                            <FormattedMessage
                              id="workflows.versionHistory.historyStarted"
                              defaultMessage="History started"
                            />
                          </EuiText>
                        </EuiFlexItem>
                        <EuiFlexItem grow={true} />
                      </EuiFlexGroup>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </EuiPanel>
    );
  }
);
WorkflowVersionHistoryPanel.displayName = 'WorkflowVersionHistoryPanel';
