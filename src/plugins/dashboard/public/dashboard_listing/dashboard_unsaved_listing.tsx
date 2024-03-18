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

import { ViewMode } from '@kbn/embeddable-plugin/public';

import { pluginServices } from '../services/plugin_services';
import { confirmDiscardUnsavedChanges } from './confirm_overlays';
import { DashboardAttributes } from '../../common/content_management';
import { dashboardUnsavedListingStrings, getNewDashboardTitle } from './_dashboard_listing_strings';
import { DASHBOARD_PANELS_UNSAVED_ID } from '../services/dashboard_backup/dashboard_backup_service';

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
  [key: string]: DashboardAttributes;
}

export interface DashboardUnsavedListingProps {
  unsavedDashboardIds: string[];
  refreshUnsavedDashboards: () => void;
  goToDashboard: (dashboardId?: string, viewMode?: ViewMode) => void;
}

export const DashboardUnsavedListing = ({
  goToDashboard,
  unsavedDashboardIds,
  refreshUnsavedDashboards,
}: DashboardUnsavedListingProps) => {
  const {
    dashboardBackup,
    dashboardContentManagement: { findDashboards },
  } = pluginServices.getServices();

  const [items, setItems] = useState<UnsavedItemMap>({});

  const onOpen = useCallback(
    (id?: string) => {
      goToDashboard(id, ViewMode.EDIT);
    },
    [goToDashboard]
  );

  const onDiscard = useCallback(
    (id?: string) => {
      confirmDiscardUnsavedChanges(() => {
        dashboardBackup.clearState(id);
        refreshUnsavedDashboards();
      });
    },
    [refreshUnsavedDashboards, dashboardBackup]
  );

  useEffect(() => {
    if (unsavedDashboardIds?.length === 0) {
      return;
    }
    let canceled = false;
    const existingDashboardsWithUnsavedChanges = unsavedDashboardIds.filter(
      (id) => id !== DASHBOARD_PANELS_UNSAVED_ID
    );
    findDashboards.findByIds(existingDashboardsWithUnsavedChanges).then((results) => {
      const dashboardMap = {};
      if (canceled) {
        return;
      }
      let hasError = false;
      const newItems = results.reduce((map, result) => {
        if (result.status === 'error') {
          hasError = true;
          if (result.error.statusCode === 404) {
            // Save object not found error
            dashboardBackup.clearState(result.id);
          }
          return map;
        }
        return {
          ...map,
          [result.id || DASHBOARD_PANELS_UNSAVED_ID]: result.attributes,
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
  }, [refreshUnsavedDashboards, dashboardBackup, unsavedDashboardIds, findDashboards]);

  return unsavedDashboardIds.length === 0 ? null : (
    <>
      <EuiCallOut
        heading="h3"
        data-test-subj="unsavedDashboardsCallout"
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
