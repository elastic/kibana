/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo, useState } from 'react';
import type { AppHeaderShareAction } from '@kbn/app-header';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import type { SaveDashboardReturn } from '../../dashboard_api/save_modal/types';
import { getAccessControlClient } from '../../services/access_control_service';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import { shareService } from '../../services/kibana_services';
import { getDashboardAccessControlState } from '../../utils/get_dashboard_access_control_state';
import { topNavStrings } from '../_dashboard_app_strings';
import { ShowShareModal } from './share/show_share_modal';
import { useShareOptions } from './share/use_share_options';

/**
 * Dashboard-owned Share action for App Header title placement and menu adaptation.
 * Returns `undefined` when the Share plugin is unavailable.
 */
export const useDashboardShareAction = ({
  maybeRedirect,
}: {
  maybeRedirect: (result?: SaveDashboardReturn) => void;
}): AppHeaderShareAction | undefined => {
  const accessControlClient = getAccessControlClient();
  const dashboardApi = useDashboardApi();
  const [isSaveInProgress, setIsSaveInProgress] = useState(false);

  const [hasOverlays, hasUnsavedChanges, lastSavedId, accessControl] = useBatchedPublishingSubjects(
    dashboardApi.hasOverlays$,
    dashboardApi.hasUnsavedChanges$,
    dashboardApi.savedObjectId$,
    dashboardApi.accessControl$
  );

  const disableTopNav = isSaveInProgress || hasOverlays;
  const { isInEditAccessMode, canManageAccessControl } = useMemo(
    () =>
      getDashboardAccessControlState({
        accessControlClient,
        accessControl,
        createdBy: dashboardApi.createdBy,
        user: dashboardApi.user,
      }),
    [accessControl, accessControlClient, dashboardApi.createdBy, dashboardApi.user]
  );

  const shareOptions = useShareOptions();

  const saveFromShareModal = useCallback(async () => {
    if (lastSavedId) {
      setIsSaveInProgress(true);
      await dashboardApi.runQuickSave();
      setTimeout(() => {
        setIsSaveInProgress(false);
      }, 100);
    } else {
      const result = await dashboardApi.runInteractiveSave();
      maybeRedirect(result);
    }
  }, [dashboardApi, lastSavedId, maybeRedirect]);

  const showShare = useCallback(
    (returnFocus?: () => void) => {
      ShowShareModal({
        shareOptions,
        canSave: (canManageAccessControl || isInEditAccessMode) && Boolean(hasUnsavedChanges),
        accessControl,
        createdBy: dashboardApi.createdBy,
        isManaged: dashboardApi.isManaged,
        accessControlClient,
        saveDashboard: saveFromShareModal,
        changeAccessMode: dashboardApi.changeAccessMode,
        onClose: returnFocus,
      });
    },
    [
      hasUnsavedChanges,
      isInEditAccessMode,
      canManageAccessControl,
      accessControl,
      saveFromShareModal,
      dashboardApi.changeAccessMode,
      dashboardApi.createdBy,
      accessControlClient,
      dashboardApi.isManaged,
      shareOptions,
    ]
  );

  const tooltipContent = useMemo(() => {
    if (!dashboardApi.isAccessControlEnabled) {
      return undefined;
    }
    return isInEditAccessMode
      ? topNavStrings.share.editModeTooltipContent
      : topNavStrings.share.writeRestrictedModeTooltipContent;
  }, [isInEditAccessMode, dashboardApi.isAccessControlEnabled]);

  return useMemo((): AppHeaderShareAction | undefined => {
    if (!shareService) {
      return undefined;
    }

    return {
      onClick: ({ returnFocus }) => {
        showShare(returnFocus);
      },
      isDisabled: disableTopNav,
      // Permission-aware tooltip when access control is on; omit otherwise
      tooltip: tooltipContent
        ? {
            title: topNavStrings.share.tooltipTitle,
            content: tooltipContent,
          }
        : undefined,
    };
  }, [disableTopNav, showShare, tooltipContent]);
};
