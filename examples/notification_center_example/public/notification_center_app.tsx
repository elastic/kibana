/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiNotificationBadge,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { IUiSettingsClient } from '@kbn/core/public';
import { useObservable } from '@kbn/use-observable';
import type { SidebarComponentProps } from '@kbn/core-chrome-sidebar';
import { SidebarHeader, SidebarBody } from '@kbn/core-chrome-sidebar-components';
import {
  NotificationEvent,
  NotificationSpacesFilter,
  NotificationStateFilter,
  type NotificationStateFilterValue,
  NotificationTypeFilter,
} from '@kbn/core-notifications-browser-components';
import {
  useNotificationEventsService,
  useNotificationSpaces,
  useNotifications,
  useUnreadNotifications,
} from '@kbn/core-notifications-browser-hooks';
import type { NotificationEvent as NotificationEventType } from '@kbn/core-notifications-browser';
import { alertTypeId, cloudTypeId, reportTypeId } from './event_types';

export const notificationCenterAppId = 'sidebarExampleNotificationCenter';

interface NotificationCenterAppProps extends SidebarComponentProps {
  uiSettings: IUiSettingsClient;
  onOpenStackManagement?: () => void;
}

const TYPE_LABELS: Readonly<Record<string, string>> = {
  [reportTypeId]: 'Report',
  [alertTypeId]: 'Alert',
  [cloudTypeId]: 'Cloud',
};

const ONE_MINUTE_MS = 60_000;
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;

function isRelativeTime(timestamp: number): boolean {
  return Date.now() - timestamp < ONE_HOUR_MS;
}

function formatTime(timestamp: number, uiSettings: IUiSettingsClient): string {
  const diff = Date.now() - timestamp;
  if (diff < ONE_MINUTE_MS) return 'Now';
  if (diff < ONE_HOUR_MS) return `${Math.floor(diff / ONE_MINUTE_MS)} minutes ago`;
  return moment(timestamp).format(uiSettings.get('dateFormat:scaled'));
}

function NotificationTime({
  timestamp,
  uiSettings,
}: {
  timestamp: number;
  uiSettings: IUiSettingsClient;
}) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!isRelativeTime(timestamp)) return;
    const id = setInterval(() => {
      setTick((t) => t + 1);
    }, ONE_MINUTE_MS);
    return () => clearInterval(id);
  }, [timestamp]);

  return <>{formatTime(timestamp, uiSettings)}</>;
}

/**
 * Collect distinct typeIds present in the events stream (preserving insertion
 * order) and derive a display label for each — preferring the static
 * `TYPE_LABELS` map, then the first event's `eventName`, then the typeId itself.
 */
function deriveTypeIdMeta(events: readonly NotificationEventType[]) {
  const typeIds: string[] = [];
  const labels: Record<string, string> = { ...TYPE_LABELS };
  for (const event of events) {
    if (!event.typeId) continue;
    if (!typeIds.includes(event.typeId)) {
      typeIds.push(event.typeId);
    }
    if (labels[event.typeId] === undefined && event.eventName) {
      labels[event.typeId] = event.eventName;
    }
  }
  return { typeIds, labels };
}

export function NotificationCenterApp({
  onClose,
  uiSettings,
  onOpenStackManagement,
}: NotificationCenterAppProps) {
  const events = useNotificationEventsService();
  const { activeSpaceId$, spacesEnabled } = useNotificationSpaces();
  const all = useNotifications();
  const unread = useUnreadNotifications();
  const activeSpaceId = useObservable(activeSpaceId$, undefined);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<ReadonlySet<string>>(new Set());
  const [stateFilter, setStateFilter] = useState<NotificationStateFilterValue>('all');
  const [currentSpaceOnly, setCurrentSpaceOnly] = useState(false);

  const { typeIds, labels } = useMemo(() => deriveTypeIdMeta(all), [all]);

  const items = useMemo(() => {
    return all.filter((event) => {
      if (selectedTypes.size > 0 && (!event.typeId || !selectedTypes.has(event.typeId))) {
        return false;
      }
      if (stateFilter === 'unread' && event.isRead) return false;
      if (stateFilter === 'pinned' && !event.isPinned) return false;
      if (currentSpaceOnly && activeSpaceId && event.spaceId !== activeSpaceId) {
        return false;
      }
      return true;
    });
  }, [all, selectedTypes, stateFilter, currentSpaceOnly, activeSpaceId]);

  // Count of distinct filters that are currently narrowing the list. Each
  // selected type chip counts as one filter; a non-default state filter or
  // an active "current space only" toggle each adds one.
  const activeFilterCount = useMemo(
    () => selectedTypes.size + (stateFilter !== 'all' ? 1 : 0) + (currentSpaceOnly ? 1 : 0),
    [selectedTypes, stateFilter, currentSpaceOnly]
  );

  const markAllAsRead = () => {
    unread.forEach((e) => events.markAsRead(e.id, true));
  };

  const buildContextMenu = useCallback(
    (event: NotificationEventType) => (_id: string) =>
      [
        <EuiContextMenuItem
          key="read"
          icon={event.isRead ? 'minus' : 'check'}
          onClick={() => events.markAsRead(event.id, !event.isRead)}
        >
          {event.isRead ? 'Mark as Unread' : 'Mark as Read'}
        </EuiContextMenuItem>,
        <EuiContextMenuItem key="delete" icon="trash" onClick={() => events.delete(event.id)}>
          Delete
        </EuiContextMenuItem>,
      ],
    [events]
  );

  return (
    <>
      <SidebarHeader
        title="Notifications"
        onClose={onClose}
        actions={
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconType={filtersOpen ? 'arrowUp' : 'arrowDown'}
                iconSide="right"
                onClick={() => setFiltersOpen((open) => !open)}
                data-test-subj="notificationCenterToggleFilters"
              >
                Filters
                {activeFilterCount > 0 && (
                  <>
                    {' '}
                    <EuiNotificationBadge
                      color="accent"
                      data-test-subj="notificationCenterActiveFilterCount"
                    >
                      {activeFilterCount}
                    </EuiNotificationBadge>
                  </>
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <HeaderSeparator />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                isDisabled={unread.length === 0}
                onClick={markAllAsRead}
                data-test-subj="notificationCenterMarkAllRead"
              >
                Mark all as read
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      />
      <SidebarBody scrollable>
        {filtersOpen ? (
          <div
            style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
            data-test-subj="notificationCenterFiltersPanel"
          >
            <NotificationTypeFilter
              typeIds={typeIds}
              selectedTypeIds={selectedTypes}
              labels={labels}
              onChange={setSelectedTypes}
            />
            <EuiSpacer size="m" />
            <NotificationStateFilter value={stateFilter} onChange={setStateFilter} />
            {spacesEnabled && (
              <>
                <EuiHorizontalRule margin="m" />
                <NotificationSpacesFilter
                  currentOnly={currentSpaceOnly}
                  onChange={setCurrentSpaceOnly}
                />
              </>
            )}
            {/* Absorb the remaining vertical space so the filter controls stay
                at their natural heights. */}
            <div aria-hidden="true" style={{ flexGrow: 1 }} />
          </div>
        ) : items.length === 0 ? (
          <EuiEmptyPrompt
            iconType="bell"
            titleSize="xs"
            title={<h3>No notifications</h3>}
            body={
              <EuiText size="s" color="subdued">
                <p>Publish events from the controller to see them appear here.</p>
              </EuiText>
            }
          />
        ) : (
          items.map((event: NotificationEventType) => (
            <NotificationEvent
              key={event.id}
              id={event.id}
              type={event.eventName}
              severity={event.severity}
              badgeColor={event.badgeColor}
              iconType={event.iconType}
              iconAriaLabel={event.eventName}
              time={<NotificationTime timestamp={event.timestamp} uiSettings={uiSettings} />}
              title={event.title}
              messages={Array.isArray(event.message) ? event.message : [event.message]}
              isRead={event.isRead}
              isPinned={event.isPinned ?? false}
              onPin={(id, isPinned) => (isPinned ? events.unpin(id) : events.pin(id))}
              onOpenContextMenu={buildContextMenu(event)}
            />
          ))
        )}
      </SidebarBody>
      {onOpenStackManagement && (
        <div data-test-subj="notificationCenterSidebarFooter">
          <EuiHorizontalRule margin="none" />
          <EuiFlexGroup
            justifyContent="flexEnd"
            gutterSize="s"
            responsive={false}
            style={{ padding: '8px 12px' }}
          >
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconType="popout"
                iconSide="right"
                onClick={() => {
                  onClose();
                  onOpenStackManagement();
                }}
                data-test-subj="notificationCenterOpenStackManagement"
              >
                Notification Center
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      )}
    </>
  );
}

/**
 * Thin vertical rule for the header. EUI doesn't ship a vertical-divider
 * primitive, so we render an inline-styled span.
 */
function HeaderSeparator() {
  const { euiTheme } = useEuiTheme();
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: 1,
        height: 16,
        backgroundColor: euiTheme.colors.borderBaseSubdued,
      }}
    />
  );
}
