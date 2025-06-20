/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useEffect } from 'react';
import { type TimeRange, getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import { i18n } from '@kbn/i18n';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import type {
  PageAttachmentPersistedState,
  CaseAttachmentsWithoutOwner,
} from '@kbn/cases-plugin/public';
import { type CasesPermissions } from '@kbn/cases-plugin/common';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { useDashboardApi } from '../../../dashboard_api/use_dashboard_api';
import { getDashboardTitle } from '../../_dashboard_app_strings';
import { cases, shareService, coreServices } from '../../../services/kibana_services';
import { DashboardLocatorParams } from '../../../../common/types';

export function AddToCaseModal({ isOpen }: { isOpen: boolean }) {
  const getCasesContext = cases?.ui?.getCasesContext;
  const canUseCases = cases?.helpers?.canUseCases;

  const casesPermissions: CasesPermissions = useMemo(() => {
    if (!canUseCases) {
      return {
        all: false,
        create: false,
        read: false,
        update: false,
        delete: false,
        push: false,
        connectors: false,
        settings: false,
        reopenCase: false,
        createComment: false,
        assign: false,
      };
    }
    return canUseCases();
  }, [canUseCases]);
  const hasCasesPermissions =
    casesPermissions.read && casesPermissions.update && casesPermissions.push;
  const CasesContext = useMemo(() => {
    if (!getCasesContext) {
      return React.Fragment;
    }
    return getCasesContext();
  }, [getCasesContext]);

  const dashboardApi = useDashboardApi();

  const [lastSavedId, title, viewMode, timeRange] = useBatchedPublishingSubjects(
    dashboardApi.savedObjectId$,
    dashboardApi.title$,
    dashboardApi.viewMode$,
    dashboardApi.timeRange$
  );

  const dashboardTitle = useMemo(() => {
    return getDashboardTitle(title, viewMode, !lastSavedId);
  }, [title, viewMode, lastSavedId]);

  if (!cases) {
    return null;
  }

  return isOpen && hasCasesPermissions && lastSavedId ? (
    <CasesContext permissions={casesPermissions} owner={[]}>
      <OpenAddToCaseOpenModal
        savedObjectId={lastSavedId}
        dashboardTitle={dashboardTitle}
        timeRange={timeRange}
      />
    </CasesContext>
  ) : null;
}

interface OpenAddToCaseModalProps {
  savedObjectId: string;
  dashboardTitle: string;
  timeRange?: TimeRange;
}

const OpenAddToCaseOpenModal = ({
  savedObjectId,
  dashboardTitle,
  timeRange,
}: OpenAddToCaseModalProps) => {
  // Conditionally checked in wrapper to ensure cases is available
  const useCasesAddToExistingCaseModal = cases?.hooks.useCasesAddToExistingCaseModal!;
  const { url: urlService } = shareService;
  const dashboardLocator = urlService.locators.get<DashboardLocatorParams>(DASHBOARD_APP_LOCATOR);
  const casesModal = useCasesAddToExistingCaseModal();

  useEffect(() => {
    if (!dashboardLocator) {
      coreServices.notifications.toasts.addDanger({
        title: i18n.translate('dashboard.topNav.cases.addToCaseModal.error.noDashboardLocator', {
          defaultMessage: 'Error adding dashboard to case',
        }),
        'data-test-subj': 'dashboardAddToCaseError',
      });
      return;
    }
    const url = dashboardLocator.getRedirectUrl({
      dashboardId: savedObjectId,
      timeRange: convertToAbsoluteTimeRange(timeRange),
    });
    const persistableStateAttachmentState: PageAttachmentPersistedState = {
      type: 'dashboard',
      url: {
        pathAndQuery: url,
        label: dashboardTitle,
        actionLabel: i18n.translate(
          'dashboard.topNav.cases.addToCaseModal.goToDashboardActionLabel',
          {
            defaultMessage: 'Go to dashboard',
          }
        ),
        iconType: 'dashboardApp',
      },
      screenContext: null,
    };
    const attachments = {
      persistableStateAttachmentState,
      persistableStateAttachmentTypeId: '.page',
      type: 'persistableState',
    };
    casesModal.open({
      getAttachments: () => [attachments] as CaseAttachmentsWithoutOwner,
    });
  }, [casesModal, dashboardLocator, savedObjectId, dashboardTitle, timeRange]);

  return <></>;
};

export const convertToAbsoluteTimeRange = (timeRange?: TimeRange): TimeRange | undefined => {
  if (!timeRange) {
    return;
  }

  const absRange = getAbsoluteTimeRange(
    {
      from: timeRange.from,
      to: timeRange.to,
    },
    { forceNow: new Date() }
  );

  return {
    from: absRange.from,
    to: absRange.to,
  };
};
