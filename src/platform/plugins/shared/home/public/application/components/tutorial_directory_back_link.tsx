/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { getTutorialIntroductionBackLink } from './tutorial_directory_return_crumb';

export function TutorialDirectoryBackLink({
  hash,
  addBasePath,
  getUrlForApp,
}: {
  hash: string;
  addBasePath: (path: string) => string;
  getUrlForApp: (appId: string, options: { path: string }) => string;
}): JSX.Element | null {
  const backLink = getTutorialIntroductionBackLink({ hash, addBasePath, getUrlForApp });
  if (!backLink.text) {
    return null;
  }
  return (
    <span css={{ display: 'block' }}>
      <EuiButtonEmpty iconType="chevronSingleLeft" size="xs" flush="left" href={backLink.href}>
        {backLink.text}
      </EuiButtonEmpty>
    </span>
  );
}
