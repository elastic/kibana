/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { generatePath } from 'react-router-dom';
import useObservable from 'react-use/lib/useObservable';
import { useCallback } from 'react';
import { ApplicationStart } from '@kbn/core-application-browser';

type NavigateToCaseView = (pathParams: { caseId: string }) => void;

const CASE_DEEP_LINK_ID = 'cases';

const generateCaseViewPath = (caseId: string): string => {
  return generatePath('/:caseId', { caseId });
};

export const useCaseViewNavigation = (application: ApplicationStart, appId?: string) => {
  const { navigateToApp, currentAppId$ } = application;

  const currentAppId = useObservable(currentAppId$) ?? '';

  const navigateToCaseView = useCallback<NavigateToCaseView>(
    (pathParams) =>
      navigateToApp(appId ?? currentAppId, {
        deepLinkId: CASE_DEEP_LINK_ID,
        path: generateCaseViewPath(pathParams.caseId),
      }),
    [navigateToApp, appId, currentAppId]
  );

  return { navigateToCaseView };
};
