/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';
import { DashboardSavedObject } from '../..';
import { dashboardUnsavedListingStrings, getNewDashboardTitle } from '../../dashboard_strings';
import { useKibana } from '../../services/kibana_react';
import { DASHBOARD_PANELS_UNSAVED_ID } from '../lib/dashboard_session_storage';
import { DashboardAppServices, DashboardRedirect } from '../../types';
import { confirmDiscardUnsavedChanges } from './confirm_overlays';

const DashboardUnsavedItem = ({
  id,
  title,
  onOpenClick,
  onDiscardClick,
}: {
  id: string;
  title?: string;
  onOpenClick: () => void;
  onDiscardClick: () => void;
}) => {
  return (
    <div className="dshUnsavedListingItem">
      <EuiFlexGroup
        alignItems="center"
        gutterSize="none"
        className="dshUnsavedListingItem__heading"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiIcon
            color="text"
            className="dshUnsavedListingItem__icon"
            type={title ? 'dashboardApp' : 'clock'}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4
              className={`dshUnsavedListingItem__title ${
                title ? '' : 'dshUnsavedListingItem__loading'
              }`}
            >
              {title || dashboardUnsavedListingStrings.getLoadingTitle()}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup
        alignItems="flexStart"
        gutterSize="none"
        className="dshUnsavedListingItem__actions"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            flush="left"
            size="s"
            color="primary"
            disabled={!title}
            onClick={onOpenClick}
            data-test-subj={title ? `edit-unsaved-${title.split(' ').join('-')}` : undefined}
            aria-label={dashboardUnsavedListingStrings.getEditAriaLabel(title ?? id)}
          >
            {dashboardUnsavedListingStrings.getEditTitle()}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            flush="left"
            size="s"
            color="danger"
            disabled={!title}
            onClick={onDiscardClick}
            data-test-subj={title ? `discard-unsaved-${title.split(' ').join('-')}` : undefined}
            aria-label={dashboardUnsavedListingStrings.getDiscardAriaLabel(title ?? id)}
          >
            {dashboardUnsavedListingStrings.getDiscardTitle()}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

interface UnsavedItemMap {
  [key: string]: DashboardSavedObject;
}

export interface DashboardUnsavedListingProps {
  refreshUnsavedDashboards: () => void;
  redirectTo: DashboardRedirect;
  unsavedDashboardIds: string[];
}

export const DashboardUnsavedListing = ({
  redirectTo,
  unsavedDashboardIds,
  refreshUnsavedDashboards,
}: DashboardUnsavedListingProps) => {
  const {
    services: {
      dashboardSessionStorage,
      savedDashboards,
      core: { overlays },
    },
  } = useKibana<DashboardAppServices>();

  const [items, setItems] = useState<UnsavedItemMap>({});

  const onOpen = useCallback(
    (id?: string) => {
      redirectTo({ destination: 'dashboard', id, editMode: true });
    },
    [redirectTo]
  );

  const onDiscard = useCallback(
    (id?: string) => {
      confirmDiscardUnsavedChanges(overlays, () => {
        dashboardSessionStorage.clearState(id);
        refreshUnsavedDashboards();
      });
    },
    [overlays, refreshUnsavedDashboards, dashboardSessionStorage]
  );

  useEffect(() => {
    if (unsavedDashboardIds?.length === 0) {
      return;
    }
    let canceled = false;
    const dashPromises = unsavedDashboardIds
      .filter((id) => id !== DASHBOARD_PANELS_UNSAVED_ID)
      .map((dashboardId) => {
        return (savedDashboards.get(dashboardId) as Promise<DashboardSavedObject>).catch(
          () => dashboardId
        );
      });
    Promise.all(dashPromises).then((dashboards: Array<string | DashboardSavedObject>) => {
      const dashboardMap = {};
      if (canceled) {
        return;
      }
      let hasError = false;
      const newItems = dashboards.reduce((map, dashboard) => {
        if (typeof dashboard === 'string') {
          hasError = true;
          dashboardSessionStorage.clearState(dashboard);
          return map;
        }
        return {
          ...map,
          [dashboard.id || DASHBOARD_PANELS_UNSAVED_ID]: dashboard,
        };
      }, dashboardMap);
      if (hasError) {
        refreshUnsavedDashboards();
        return;
      }
      setItems(newItems);
    });
    return () => {
      canceled = true;
    };
  }, [savedDashboards, dashboardSessionStorage, refreshUnsavedDashboards, unsavedDashboardIds]);

  return unsavedDashboardIds.length === 0 ? null : (
    <>
      <EuiCallOut
        heading="h3"
        title={dashboardUnsavedListingStrings.getUnsavedChangesTitle(
          unsavedDashboardIds.length > 1
        )}
      >
        {unsavedDashboardIds.map((dashboardId: string) => {
          const title: string | undefined =
            dashboardId === DASHBOARD_PANELS_UNSAVED_ID
              ? getNewDashboardTitle()
              : items[dashboardId]?.title;
          const redirectId = dashboardId === DASHBOARD_PANELS_UNSAVED_ID ? undefined : dashboardId;
          return (
            <DashboardUnsavedItem
              key={dashboardId}
              id={dashboardId}
              title={title}
              onOpenClick={() => onOpen(redirectId)}
              onDiscardClick={() => onDiscard(redirectId)}
            />
          );
        })}
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
