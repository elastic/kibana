/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID } from '../../../common';
import { useKibana } from '../use_kibana';

const workflowsTitle = i18n.translate('workflows.breadcrumbs.title', {
  defaultMessage: 'Workflows',
});

/**
 * Sets the breadcrumbs for the Workflows app in app and in the document title.
 * If `workflowTitle` is provided, it will be appended to the breadcrumbs list.
 */
export const useWorkflowsBreadcrumbs = (workflowTitle?: string) => {
  const { chrome, application, serverless } = useKibana().services;

  useEffect(() => {
    const trailingBreadcrumbs: ChromeBreadcrumb[] = workflowTitle ? [{ text: workflowTitle }] : [];
    if (serverless) {
      // In serverless, we leading breadcrumbs are managed by the serverless plugin, only the trailing breadcrumbs need to be set here
      serverless.setBreadcrumbs(trailingBreadcrumbs);
    } else {
      // In non-serverless, we need to set all the breadcrumbs, and the trailing breadcrumbs under "project" for the solution navigation mode
      const allBreadcrumbs: ChromeBreadcrumb[] = [
        {
          text: workflowsTitle,
          href: application?.getUrlForApp(PLUGIN_ID),
          onClick: (event) => {
            if (event) {
              event.preventDefault();
            }
            application?.navigateToApp(PLUGIN_ID);
          },
        },
        ...trailingBreadcrumbs,
      ];

      chrome.setBreadcrumbs(allBreadcrumbs, { project: { value: trailingBreadcrumbs } });
    }
    // Apply the document title in any case
    chrome.docTitle.change([...(workflowTitle ? [workflowTitle] : []), workflowsTitle]);
  }, [chrome, application, serverless, workflowTitle]);
};
