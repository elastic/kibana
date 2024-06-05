/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect } from 'react';
import { VisualizeServices } from '../../types';
import {
  getCreateBreadcrumbs,
  getCreateServerlessBreadcrumbs,
  getEditBreadcrumbs,
  getEditServerlessBreadcrumbs,
} from '../breadcrumbs';

interface UseVisEditorBreadcrumbsParams {
  services: VisualizeServices;
  originatingApp?: string;
  visTitle?: string;
}

export const useVisEditorBreadcrumbs = ({
  services,
  originatingApp,
  visTitle,
}: UseVisEditorBreadcrumbsParams) =>
  useEffect(() => {
    const {
      chrome,
      serverless,
      application: { navigateToApp },
      stateTransferService,
      history,
    } = services;
    const originatingAppName = originatingApp
      ? stateTransferService.getAppNameFromId(originatingApp)
      : undefined;
    const redirectToOrigin = originatingApp ? () => navigateToApp(originatingApp) : undefined;

    if (history.location.pathname === '/create') {
      if (serverless?.setBreadcrumbs) {
        serverless.setBreadcrumbs(
          getCreateServerlessBreadcrumbs({
            byValue: Boolean(originatingApp),
            originatingAppName,
            redirectToOrigin,
          })
        );
      } else {
        chrome.setBreadcrumbs(
          getCreateBreadcrumbs({
            byValue: Boolean(originatingApp),
            originatingAppName,
            redirectToOrigin,
          })
        );
      }
    } else if (visTitle) {
      if (serverless?.setBreadcrumbs) {
        serverless.setBreadcrumbs(
          getEditServerlessBreadcrumbs({ originatingAppName, redirectToOrigin }, visTitle)
        );
      } else {
        chrome.setBreadcrumbs(
          getEditBreadcrumbs({ originatingAppName, redirectToOrigin }, visTitle)
        );
      }
      chrome.docTitle.change(visTitle);
    }
  }, [originatingApp, services, visTitle]);
