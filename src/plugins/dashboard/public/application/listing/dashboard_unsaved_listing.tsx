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
import {
  createConfirmStrings,
  dashboardUnsavedListingStrings,
  getNewDashboardTitle,
} from '../../dashboard_strings';
import { useKibana } from '../../services/kibana_react';
import { DASHBOARD_PANELS_UNSAVED_ID } from '../lib/dashboard_panel_storage';
import { DashboardAppServices, DashboardRedirect } from '../types';
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

export const DashboardUnsavedListing = ({ redirectTo }: { redirectTo: DashboardRedirect }) => {
  const {
    services: {
      dashboardPanelStorage,
      savedDashboards,
      core: { overlays },
    },
  } = useKibana<DashboardAppServices>();

  const [items, setItems] = useState<UnsavedItemMap>({});
  const [dashboardIds, setDashboardIds] = useState<string[]>(
    dashboardPanelStorage.getDashboardIdsWithUnsavedChanges()
  );

  const onOpen = useCallback(
    (id?: string) => {
      redirectTo({ destination: 'dashboard', id, editMode: true });
    },
    [redirectTo]
  );

  const onDiscard = useCallback(
    (id?: string) => {
      confirmDiscardUnsavedChanges(
        overlays,
        () => {
          dashboardPanelStorage.clearPanels(id);
          setDashboardIds(dashboardPanelStorage.getDashboardIdsWithUnsavedChanges());
        },
        createConfirmStrings.getCancelButtonText()
      );
    },
    [overlays, dashboardPanelStorage]
  );

  useEffect(() => {
    if (dashboardIds?.length === 0) {
      return;
    }
    let canceled = false;
    const dashPromises = dashboardIds
      .filter((id) => id !== DASHBOARD_PANELS_UNSAVED_ID)
      .map((dashboardId) => savedDashboards.get(dashboardId));
    Promise.all(dashPromises).then((dashboards: DashboardSavedObject[]) => {
      const dashboardMap = {};
      if (canceled) {
        return;
      }
      setItems(
        dashboards.reduce((map, dashboard) => {
          return {
            ...map,
            [dashboard.id || DASHBOARD_PANELS_UNSAVED_ID]: dashboard,
          };
        }, dashboardMap)
      );
    });
    return () => {
      canceled = true;
    };
  }, [dashboardIds, savedDashboards]);

  return dashboardIds.length === 0 ? null : (
    <>
      <EuiCallOut
        heading="h3"
        title={dashboardUnsavedListingStrings.getUnsavedChangesTitle(dashboardIds.length > 1)}
      >
        {dashboardIds.map((dashboardId: string) => {
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
