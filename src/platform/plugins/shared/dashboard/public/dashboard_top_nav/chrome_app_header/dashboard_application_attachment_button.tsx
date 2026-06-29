/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ApplicationAttachmentLinkDescriptor } from '@kbn/agent-builder-browser';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import { agentBuilderService } from '../../services/kibana_services';

const DASHBOARD_ATTACHMENT_TYPE = 'platform.dashboard.dashboard_state';

export const DashboardApplicationAttachmentButton = () => {
  const dashboardApi = useDashboardApi();
  const draftAttachmentIdRef = useRef(uuidv4());
  const [dashboardId] = useBatchedPublishingSubjects(dashboardApi.savedObjectId$);

  const linkDescriptor = useMemo<ApplicationAttachmentLinkDescriptor>(
    () => ({
      origin: dashboardId,
    }),
    [dashboardId]
  );

  const getAttachment = useCallback(() => {
    if (!dashboardId) {
      return null;
    }

    const attributes = dashboardApi.getSerializedState().attributes;
    if (!attributes) {
      return null;
    }

    return {
      id: draftAttachmentIdRef.current,
      origin: dashboardId,
      type: DASHBOARD_ATTACHMENT_TYPE,
      // POC: matches dashboard_app_integration payload; auto-sync applies full conversion.
      data: attributes as AttachmentInput['data'],
    };
  }, [dashboardApi, dashboardId]);

  if (!agentBuilderService?.ApplicationAttachmentButton) {
    return null;
  }

  const ApplicationAttachmentButton = agentBuilderService.ApplicationAttachmentButton;

  return (
    <ApplicationAttachmentButton
      getAttachment={getAttachment}
      linkDescriptor={linkDescriptor}
      iconType="documents"
      displayVariant="appHeader"
    />
  );
};
