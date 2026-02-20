/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import {
  EuiAvatar,
  EuiBadge,
  EuiButtonIcon,
  EuiConfirmModal,
  EuiContextMenu,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiPopover,
  EuiRadioGroup,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useWorkflowHistory } from '../../../entities/workflows/model/use_workflow_history';
import type { WorkflowHistoryItem } from '../../../entities/workflows/model/use_workflow_history';
import { useKibana } from '../../../hooks/use_kibana';
import { queryClient } from '../../../shared/lib/query_client';
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
  /** Called after a version is successfully restored; use to reload workflow and e.g. close the panel. */
  onRestoreSuccess?: () => void;
  /** Event id of the version currently used for diff comparison in the editor. */
  selectedVersionEventId?: string | null;
  /** Set or clear the version used for diff (current YAML vs this version). Pass null to clear. */
  onSelectVersionForDiff?: (payload: { eventId: string; yaml: string } | null) => void;
  /** How to display the diff: unified (single editor with inline changes) or split (side-by-side). */
  diffViewMode?: 'unified' | 'split';
  /** Called when the user changes the diff view mode. */
  onDiffViewModeChange?: (mode: 'unified' | 'split') => void;
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

const restoreLabel = i18n.translate('workflows.versionHistory.restore', {
  defaultMessage: 'Restore this version',
});
const compareWithVersionLabel = i18n.translate('workflows.versionHistory.compareWithVersion', {
  defaultMessage: 'Compare with this version',
});
const clearComparisonLabel = i18n.translate('workflows.versionHistory.clearComparison', {
  defaultMessage: 'Clear comparison',
});

const diffViewSettingsLabel = i18n.translate('workflows.versionHistory.diffViewSettings', {
  defaultMessage: 'Diff view settings',
});
const diffViewSectionTitle = i18n.translate('workflows.versionHistory.diffViewSectionTitle', {
  defaultMessage: 'Diff view',
});
const unifiedViewLabel = i18n.translate('workflows.versionHistory.unifiedView', {
  defaultMessage: 'Unified',
});
const splitViewLabel = i18n.translate('workflows.versionHistory.splitView', {
  defaultMessage: 'Split',
});

function VersionHistoryListItem({
  item,
  onRestoreRequest,
  onCompareWithVersion,
  onClearComparison,
  isComparingWithThisVersion,
}: {
  item: WorkflowHistoryItem;
  onRestoreRequest: (eventId: string) => void;
  onCompareWithVersion: (eventId: string) => void;
  onClearComparison: () => void;
  isComparingWithThisVersion: boolean;
}) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const timestamp = item['@timestamp'] ? new Date(item['@timestamp']) : null;
  const userName = item.user?.name ?? item.user?.id ?? 'Unknown';
  const changedFields = item.object?.fields?.changed ?? [];
  const changeCount = changedFields.length;
  const action = item.event?.action ?? 'workflow-update';
  const isCreate = action === 'workflow-create';
  const eventId = item.event?.id;

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

  const panelItems: EuiContextMenuPanelItemDescriptor[] = [];
  if (eventId) {
    if (isComparingWithThisVersion) {
      panelItems.push({
        name: clearComparisonLabel,
        icon: 'cross',
        'data-test-subj': 'workflowVersionHistoryClearComparison',
        onClick: () => {
          setIsPopoverOpen(false);
          onClearComparison();
        },
      });
    } else {
      panelItems.push({
        name: compareWithVersionLabel,
        icon: 'diff',
        'data-test-subj': 'workflowVersionHistoryCompare',
        onClick: () => {
          setIsPopoverOpen(false);
          onCompareWithVersion(eventId);
        },
      });
    }
    panelItems.push({
      name: restoreLabel,
      icon: 'refresh',
      'data-test-subj': 'workflowVersionHistoryRestore',
      onClick: () => {
        setIsPopoverOpen(false);
        onRestoreRequest(eventId);
      },
    });
  }

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      title: '',
      items: panelItems.length > 0 ? panelItems : [{ name: '-', disabled: true }],
    },
  ];

  const actionsLabel = i18n.translate('workflows.versionHistory.actions', {
    defaultMessage: 'Actions',
  });

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
        <EuiPopover
          button={
            <EuiButtonIcon
              iconType="boxesVertical"
              size="s"
              color="text"
              aria-label={actionsLabel}
              data-test-subj="workflowVersionHistoryRowActions"
              onClick={() => setIsPopoverOpen((open) => !open)}
            />
          }
          isOpen={isPopoverOpen}
          closePopover={() => setIsPopoverOpen(false)}
          anchorPosition="downRight"
          panelPaddingSize="none"
        >
          <EuiContextMenu panels={panels} initialPanelId={0} />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

const getPanelStyles = (euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']) => ({
  panel: css({
    height: '100%',
    minHeight: '100%',
    alignSelf: 'stretch',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: euiTheme.colors.backgroundBasePlain,
    boxShadow: 'none',
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
    borderRadius: String(euiTheme.border.radius.medium ?? 'medium'),
    boxShadow: 'none',
  }),
  versionEntryCard: css({
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    marginBottom: '8px',
    backgroundColor: euiTheme.colors.emptyShade,
    border: `1px solid ${euiTheme.colors.borderBasePlain}`,
    borderRadius: String(euiTheme.border.radius.medium ?? 'medium'),
    boxShadow: 'none',
    '&:last-of-type': {
      marginBottom: 0,
    },
    '& > *': {
      flex: '1 1 0',
      minWidth: 0,
    },
  }),
  versionEntryCardSelected: css({
    backgroundColor: euiTheme.colors.backgroundBasePrimary,
  }),
});

const restoreConfirmTitle = i18n.translate('workflows.versionHistory.restoreConfirmTitle', {
  defaultMessage: 'Restore this version?',
});
const restoreConfirmMessage = i18n.translate('workflows.versionHistory.restoreConfirmMessage', {
  defaultMessage:
    'The workflow will be reverted to this version. Your current editor content will be replaced.',
});
const restoreConfirmConfirm = i18n.translate('workflows.versionHistory.restoreConfirmConfirm', {
  defaultMessage: 'Restore',
});
const restoreConfirmCancel = i18n.translate('workflows.versionHistory.restoreConfirmCancel', {
  defaultMessage: 'Cancel',
});

export const WorkflowVersionHistoryPanel = React.memo<WorkflowVersionHistoryPanelProps>(
  ({
    workflowId,
    onClose,
    hasUnsavedChanges = false,
    highlightDiff = false,
    setHighlightDiff = () => {},
    lastUpdatedAt = null,
    onRestoreSuccess,
    selectedVersionEventId = null,
    onSelectVersionForDiff,
    diffViewMode = 'unified',
    onDiffViewModeChange,
  }) => {
    const { euiTheme } = useEuiTheme();
    const styles = getPanelStyles(euiTheme);
    const getFormattedDateTime = useGetFormattedDateTime();
    const { http, notifications } = useKibana().services;
    const { data, isLoading, error } = useWorkflowHistory(workflowId);
    const [restoreTargetEventId, setRestoreTargetEventId] = useState<string | null>(null);
    const [isRestoring, setIsRestoring] = useState(false);
    const [isDiffSettingsOpen, setIsDiffSettingsOpen] = useState(false);

    const onRestoreRequest = useCallback((eventId: string) => {
      setRestoreTargetEventId(eventId);
    }, []);

    const onCompareWithVersion = useCallback(
      async (eventId: string) => {
        if (!onSelectVersionForDiff) return;
        try {
          const version = await http.get<Record<string, unknown>>(
            `/api/workflows/${workflowId}/history/${eventId}`
          );
          const object = version?.object as { snapshot?: { yaml?: string } } | undefined;
          const yaml = object?.snapshot?.yaml;
          if (typeof yaml === 'string') {
            onSelectVersionForDiff({ eventId, yaml });
          } else {
            notifications.toasts.addWarning(
              i18n.translate('workflows.versionHistory.compareNoYaml', {
                defaultMessage: 'This version has no YAML to compare.',
              })
            );
          }
        } catch (err) {
          notifications.toasts.addError(err instanceof Error ? err : new Error(String(err)), {
            title: i18n.translate('workflows.versionHistory.compareErrorTitle', {
              defaultMessage: 'Could not load version',
            }),
          });
        }
      },
      [workflowId, http, notifications.toasts, onSelectVersionForDiff]
    );

    const onClearComparison = useCallback(() => {
      onSelectVersionForDiff?.(null);
    }, [onSelectVersionForDiff]);

    const onRestoreConfirm = useCallback(async () => {
      if (!restoreTargetEventId) return;
      setIsRestoring(true);
      try {
        await http.post(`/api/workflows/${workflowId}/restore`, {
          body: JSON.stringify({ eventId: restoreTargetEventId }),
        });
        queryClient.invalidateQueries({ queryKey: ['workflows', workflowId, 'history'] });
        queryClient.invalidateQueries({ queryKey: ['workflows', workflowId] });
        queryClient.invalidateQueries({ queryKey: ['workflows'] });
        setRestoreTargetEventId(null);
        onRestoreSuccess?.();
      } catch (err) {
        notifications.toasts.addError(err instanceof Error ? err : new Error(String(err)), {
          title: i18n.translate('workflows.versionHistory.restoreErrorTitle', {
            defaultMessage: 'Restore failed',
          }),
        });
      } finally {
        setIsRestoring(false);
      }
    }, [restoreTargetEventId, workflowId, http, notifications.toasts, onRestoreSuccess]);

    const onRestoreCancel = useCallback(() => {
      if (!isRestoring) setRestoreTargetEventId(null);
    }, [isRestoring]);

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
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiPopover
                  button={
                    <EuiToolTip content={diffViewSettingsLabel} disableScreenReaderOutput>
                      <EuiButtonIcon
                        iconType="gear"
                        aria-label={diffViewSettingsLabel}
                        onClick={() => setIsDiffSettingsOpen((open) => !open)}
                        data-test-subj="workflowVersionHistoryDiffSettingsButton"
                      />
                    </EuiToolTip>
                  }
                  isOpen={isDiffSettingsOpen}
                  closePopover={() => setIsDiffSettingsOpen(false)}
                  anchorPosition="downRight"
                  panelPaddingSize="m"
                  data-test-subj="workflowVersionHistoryDiffSettingsPopover"
                >
                  <EuiText size="s" css={{ fontWeight: 600 }}>
                    {diffViewSectionTitle}
                  </EuiText>
                  <EuiSpacer size="m" />
                  <EuiRadioGroup
                    options={[
                      {
                        id: 'unified',
                        label: unifiedViewLabel,
                        value: 'unified',
                      },
                      {
                        id: 'split',
                        label: splitViewLabel,
                        value: 'split',
                      },
                    ]}
                    idSelected={diffViewMode}
                    onChange={(id) => {
                      onDiffViewModeChange?.(id as 'unified' | 'split');
                      setIsDiffSettingsOpen(false);
                    }}
                    name="diffViewMode"
                    data-test-subj="workflowVersionHistoryDiffViewMode"
                  />
                </EuiPopover>
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
          {error ? (
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
          ) : null}
          {!isLoading && !error && data && (
            <>
              {hasUnsavedChanges && (
                <div
                  css={[
                    styles.currentVersionCard,
                    !selectedVersionEventId && styles.versionEntryCardSelected,
                  ]}
                  data-test-subj="workflowVersionHistoryCurrentVersion"
                  data-selected={!selectedVersionEventId ? 'true' : undefined}
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
                  {data.items.map((item, index) => {
                    const isComparingWithThisVersion =
                      selectedVersionEventId != null && item.event?.id === selectedVersionEventId;
                    const isLatestVersionWhenNotComparing =
                      !selectedVersionEventId && !hasUnsavedChanges && index === 0;
                    const isSelected =
                      isComparingWithThisVersion || isLatestVersionWhenNotComparing;
                    return (
                      <div
                        key={item.event?.id ?? item['@timestamp'] ?? Math.random()}
                        css={[
                          styles.versionEntryCard,
                          isSelected && styles.versionEntryCardSelected,
                        ]}
                        data-test-subj="workflowVersionHistoryEntry"
                        data-selected={isSelected || undefined}
                      >
                        <VersionHistoryListItem
                          item={item}
                          onRestoreRequest={onRestoreRequest}
                          onCompareWithVersion={onCompareWithVersion}
                          onClearComparison={onClearComparison}
                          isComparingWithThisVersion={item.event?.id === selectedVersionEventId}
                        />
                      </div>
                    );
                  })}
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
                            aria-label={i18n.translate(
                              'workflows.versionHistory.historyStartedIcon',
                              {
                                defaultMessage: 'History started',
                              }
                            )}
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
        {restoreTargetEventId !== null && (
          <EuiConfirmModal
            title={restoreConfirmTitle}
            aria-label={restoreConfirmTitle}
            onCancel={onRestoreCancel}
            onConfirm={onRestoreConfirm}
            cancelButtonText={restoreConfirmCancel}
            confirmButtonText={restoreConfirmConfirm}
            confirmButtonDisabled={isRestoring}
            isLoading={isRestoring}
            data-test-subj="workflowVersionHistoryRestoreConfirmModal"
          >
            <p>{restoreConfirmMessage}</p>
          </EuiConfirmModal>
        )}
      </EuiPanel>
    );
  }
);
WorkflowVersionHistoryPanel.displayName = 'WorkflowVersionHistoryPanel';
