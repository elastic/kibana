/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect } from 'react';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID } from '../../../common';
import { useKibana } from '../use_kibana';

const workflowsTitle = i18n.translate('workflows.breadcrumbs.title', {
  defaultMessage: 'Workflows',
});

const breadcrumbText = (breadcrumb: ChromeBreadcrumb): string =>
  typeof breadcrumb.text === 'string' ? breadcrumb.text : '';

/**
 * Sets the breadcrumbs for the Workflows app in app and in the document title.
 * If `workflowTitle` is provided, it will be appended to the breadcrumbs list.
 */
export const useWorkflowsBreadcrumbs = (workflowTitle?: string) => {
  const setBreadcrumbs = useSetWorkflowsBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs(workflowTitle ? [{ text: workflowTitle }] : []);
  }, [setBreadcrumbs, workflowTitle]);
};

/**
 * Returns a setter for the Workflows app breadcrumbs. Unlike
 * {@link useWorkflowsBreadcrumbs} (which sets a single trailing title via an
 * effect), this lets callers imperatively set an array of trailing breadcrumbs
 * — e.g. a clickable "Library" crumb plus the loaded template name — once data
 * is available. The leading "Workflows" root and the document title are handled
 * the same way as {@link useWorkflowsBreadcrumbs}.
 */
export const useSetWorkflowsBreadcrumbs = () => {
  const { chrome, application, serverless } = useKibana().services;

  return useCallback(
    (trailingBreadcrumbs: ChromeBreadcrumb[]) => {
      if (serverless) {
        // In serverless the leading breadcrumbs are managed by the serverless plugin.
        serverless.setBreadcrumbs(trailingBreadcrumbs);
      } else {
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

      const trailingTitles = trailingBreadcrumbs.map(breadcrumbText).filter(Boolean).reverse();
      chrome.docTitle.change([...trailingTitles, workflowsTitle]);
    },
    [chrome, application, serverless]
  );
};
