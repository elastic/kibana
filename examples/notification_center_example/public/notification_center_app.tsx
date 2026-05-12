/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { type Observable, of as rxOf } from 'rxjs';
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
  useNotifications,
  useUnreadNotifications,
} from '@kbn/core-notifications-browser-hooks';
import type { NotificationEvent as NotificationEventType } from '@kbn/core-notifications-browser';
import { alertTypeId, cloudTypeId, reportTypeId } from './event_types';

export const notificationCenterAppId = 'sidebarExampleNotificationCenter';

interface NotificationCenterAppProps extends SidebarComponentProps {
  /** Active spaceId observable. Emits `undefined` when the spaces plugin is unavailable. */
  activeSpaceId$?: Observable<string | undefined>;
  /** Whether the spaces plugin is enabled at runtime. */
  spacesEnabled?: boolean;
}

const EMPTY_SPACE$ = rxOf<string | undefined>(undefined);

const TYPE_LABELS: Readonly<Record<string, string>> = {
  [reportTypeId]: 'Report',
  [alertTypeId]: 'Alert',
  [cloudTypeId]: 'Cloud',
};

const formatTime = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleString();
};

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
  activeSpaceId$,
  spacesEnabled = false,
}: NotificationCenterAppProps) {
  const events = useNotificationEventsService();
  const all = useNotifications();
  const unread = useUnreadNotifications();
  const activeSpaceId = useObservable(activeSpaceId$ ?? EMPTY_SPACE$, undefined);

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

  const markAllAsRead = () => {
    unread.forEach((e) => events.markAsRead(e.id, true));
  };

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
      <SidebarBody>
        <EuiAccordion
          id="notificationCenterFilters"
          arrowDisplay="none"
          buttonContent={null}
          forceState={filtersOpen ? 'open' : 'closed'}
          paddingSize="none"
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
          <EuiSpacer size="m" />
        </EuiAccordion>

        {items.length === 0 ? (
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
              time={formatTime(event.timestamp)}
              title={event.title}
              messages={[event.message]}
              isRead={event.isRead}
              isPinned={event.isPinned ?? false}
              onPin={(id, isPinned) => (isPinned ? events.unpin(id) : events.pin(id))}
            />
          ))
        )}
      </SidebarBody>
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
