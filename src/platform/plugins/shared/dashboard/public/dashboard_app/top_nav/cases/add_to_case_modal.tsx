/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { AttachmentType } from '@kbn/cases-plugin/common';
import { LINK_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { DashboardLocatorParams } from '../../../../common/types';
import { cases, shareService } from '../../../services/kibana_services';

export const AddToCaseOpenModal = ({
  savedObjectId,
  dashboardTitle,
}: {
  savedObjectId: string;
  dashboardTitle: string;
}) => {
  const {
    hooks: { useCasesAddToExistingCaseModal },
  } = cases;
  const { url: urlService } = shareService;
  const dashboardLocator = urlService.locators.get<DashboardLocatorParams>(DASHBOARD_APP_LOCATOR);
  const casesModal = useCasesAddToExistingCaseModal({
    onClose: () => {},
    onSuccess: () => {},
  });

  useEffect(() => {
    const url = dashboardLocator.getRedirectUrl({
      dashboardId: savedObjectId,
    });
    const attachments = {
      persistableStateAttachmentState: {
        pathname: url,
        label: dashboardTitle,
        type: 'dashboard',
        icon: 'dashboardApp',
      },
      persistableStateAttachmentTypeId: LINK_ATTACHMENT_TYPE,
      type: AttachmentType.persistableState,
    };
    casesModal.open({ getAttachments: () => [attachments] });
  }, [casesModal, dashboardLocator, savedObjectId, dashboardTitle]);

  return <></>;
};
